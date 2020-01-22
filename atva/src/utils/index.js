export function documentUrl(documentId) {
  return `/?id=${documentId}`;
}

export function parseQueryStringToObj(queryString) {
  var dictionary = {};

  if (typeof queryString !== 'string' || queryString.length === 0) {
    return dictionary;
  }

  if (queryString.indexOf('?') === 0) {
    queryString = queryString.substr(1);
  }

  var parts = queryString.split('&');

  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    var keyValuePair = p.split('=');

    var key = keyValuePair[0];
    var value = keyValuePair[1];

    value && value.replace(/\+/g, '%20');
    value = decodeURIComponent(value);

    dictionary[key] = value;
  }

  return dictionary;
}