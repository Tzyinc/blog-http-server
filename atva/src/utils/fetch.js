import { SummarizerManager } from "node-summarizer";
import { TfIdf } from "natural";
import jsonpack from "jsonpack/main";

let fakeServerJson = {};
let workingFileHash ="";

/**
 * @typedef {Object} DocumentHash
 * @property {string} doc_hash
 */

/**
 * creates a document and returns a :"hash".
 * 
 * @param {string}   documentTitle
 * @return {DocumentHash} document hash
 */
export function initUrlDocument(documentObj) {
  fakeServerJson = documentObj;
  workingFileHash = Object.keys(documentObj)[0];
}


/**
 * @typedef {Object} DocumentHash
 * @property {string} doc_hash
 */

/**
 * creates a document and returns a :"hash".
 * 
 * @param {string}   documentTitle
 * @return {DocumentHash} document hash
 */
export function createDocument(documentTitle) {
  console.log('createDocument')
  fakeServerJson[documentTitle] = { title: documentTitle, doc_hash: documentTitle };
  workingFileHash = documentTitle;

  return new Promise(function (resolve, reject) {
    resolve(fakeServerJson[documentTitle]);
  });
}


/**
 * @typedef {Object} DocumentDetails
 * @property {Array.<Section>} Sections
 * @property {string} doc_hash
 * @property {string} title
 */

/**
* @typedef {Object} Section
* @property {number} id
* @property {string} summary
* @property {string} text
* @property {number} timestamp
* @property {Array.<string>} tags
*/

/**
 * given a hash, return the document
 *
 * @param {string}   documentHash
 * @return {DocumentDetails} 
 */
export function getDocument(documentHash) {

  console.log('getDocument')
  workingFileHash = documentHash
  return new Promise(function (resolve, reject) {
    resolve(fakeServerJson[documentHash]);
  });
}


/**
* @typedef {Object} GeneratedSection
* @property {number} id
* @property {number} timestamp
*/

/**
 * given a hash, return the document
 *
 * @param {string}   documentHash
 * @return {GeneratedSection}
 */
export function createSection(documentHash) {
  workingFileHash = documentHash
  let currDocument = fakeServerJson[documentHash];
  let section = {
    timestamp: new Date().getTime()
  }

  if (currDocument && currDocument.sections) {
    section.id = currDocument.sections.length;
    currDocument.sections.push(section)
  } else {
    if (!currDocument) {
      fakeServerJson[documentHash] = { title: documentHash, doc_hash: documentHash };
    }
    currDocument = fakeServerJson[documentHash];
    section.id = 0;
    currDocument.sections = [section];
  }

  return new Promise(function (resolve, reject) {
    resolve(section);
  });
}


/**
* @typedef {Object} GeneratedSummary
* @property {string} summary
*/

/**
 * change the text in a given section
 *
 * @param {number}   sectionId
 * @param {string}   text
 * @return {GeneratedSummary}
 */
export function setText(sectionId, text) {
  let currDocument = fakeServerJson[workingFileHash];

  if (
    currDocument &&
    currDocument.sections
  ) {
    if (
      !currDocument.sections[sectionId]
    ) {
      let section = {
        timestamp: new Date().getTime(),
        id: currDocument.sections.length,
      }
      currDocument.sections.push(section);
    }

    currDocument.sections[sectionId].text = text

    if (text) {
      let Summarizer = new SummarizerManager(text, 1); 
      let summary = Summarizer.getSummaryByFrequency().summary;
      
      currDocument.sections[sectionId].summary = Object.keys(summary).length === 0 && summary.constructor === Object ? "" : summary;
    }

    const packedJSON = jsonpack.pack(fakeServerJson);
    window.history.pushState("", "", `?d=${packedJSON}`);
    return new Promise(function (resolve, reject) {
      resolve(
        currDocument.sections[sectionId]
      );
    });
  }

  return new Promise(function (resolve, reject) {
    reject({ Error: "something wrong setText"});
  });
}

/**
 * change the tag in a given section
 *
 * @param {number}   sectionId
 * @param {Array.<string}   tags
 */
export function setTags(sectionId, tags) {
  let currDocument = fakeServerJson[workingFileHash];

  if (
    currDocument &&
    currDocument.sections &&
    currDocument.sections[sectionId] &&
    currDocument.sections[sectionId].tags
  ) {
    currDocument.sections[sectionId].tags = tags
    return new Promise(function (resolve, reject) {
      resolve();
    });
  }

  return new Promise(function (resolve, reject) {
    reject({ Error: "something wrong setTags" });
  });
}


/**
 * delete the given section
 *
 * @param {number}   sectionId
 */
export function deleteSection(sectionId) {
  let currDocument = fakeServerJson[workingFileHash];

  if (
    currDocument &&
    currDocument.sections &&
    currDocument.sections[sectionId]
  ) {
    currDocument.sections = currDocument.sections.filter(item => item.id !== sectionId)
    
    return new Promise(function (resolve, reject) {
      resolve();
    });
  }

  return new Promise(function (resolve, reject) {
    reject({ Error: "something wrong deleteSection" });
  });

}

/**
* @typedef {Object} Section
* @property {number} timestamp
* @property {number} id
* @property {string} text
* @property {string} summary
* @property {Array<string>>} tags
*/

/**
* @typedef {Object} FullDocument
* @property {Array<Section>} Sections
* @property {string} title
* @property {string} doc_hash
*/

/**
 * change the text in a given section
 *
 * @param {string}   documentHash
 * @return {FullDocument}
 */
export function generateTags(documentHash) {
  let currDocument = fakeServerJson[documentHash];

  let tfidf = new TfIdf();

  let { sections } = currDocument;
  for (let section of sections) {
    tfidf.addDocument(section.text || "");
  }


  for (let index in sections) {
    let allTerms = tfidf.listTerms(index).sort((a, b) => b.tfidf-a.tfidf);
    let tagsForSection = allTerms.map(item => item.term).slice(0, 5);
    sections[index].tags = tagsForSection;
  }
  const packedJSON = jsonpack.pack(fakeServerJson);
  window.history.pushState("", "", `?d=${packedJSON}`);

  return new Promise(function (resolve, reject) {
    resolve(currDocument);
  });
}
