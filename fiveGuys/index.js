getPSI()
setInterval(function () {
    getPSI()
}, 60 * 1000); 

let wrapper = document.getElementById('wrapper');
let prev = {};
let updated = 0;

function getPSI() {
    console.log('fetching');
    // pm2.5 Chart1HRPM25
    // psi ChartPM25

    fetch(`https://blogbackend.tenzhiyang.com/wuhanUpdated`).then(response => response.json()).then(data => {
        if (updated !== data.date) {
            fetch(`https://blogbackend.tenzhiyang.com/wuhanCNA`,
                {
                    "method": "GET"
                }).then(
                    function (response) {
                        if (response.status !== 200) {
                            console.log('Looks like there was a problem. Status Code: ' +
                                response.status);
                            return;
                        }

                        // Examine the text in the response
                        response.json().then(function (data) {
                            let newsList = data.data.news;
                            newsList = newsList.sort((a, b) => b.created - a.created);
                            if (prev.created != newsList[0].created) {
                                wrapper.innerHTML = "";
                                for (let news of newsList) {
                                    wrapper.innerHTML += `
                                <h4>${news.newstitle}</h4>
                                <h5>${new Date(news.created * 1000)}</h5>
                                <div class="content">${news.contents}</div>
                            `;
                                    wrapper.innerHTML += '<br />';
                                }
                            }
                            prev = newsList[0]
                        });
                    }
                )
                .catch(function (err) {
                    console.log('Fetch Error :-S', err);
                });
            updated = data.date;
        }
    }).catch(function (err) {
        console.log('Fetch Error :-S', err);
    });
    
}
