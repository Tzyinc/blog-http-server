getPSI()
setInterval(function () {
    getPSI()
}, 60 * 1000); 

function getPSI() {
    console.log('fetching');
    // pm2.5 Chart1HRPM25
    // psi ChartPM25
    fetch(`https://psi.tenzhiyang.com/psi`,
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
                    console.log(data);
                    const Chart1HRPM25 = data.Chart1HRPM25.West.Data;
                    const ChartPM25 = data.ChartPM25.West.Data;
                    // console.log(Chart1HRPM25)
                    const curr25 = Chart1HRPM25[Chart1HRPM25.length - 1];
                    const currPSI = ChartPM25[ChartPM25.length - 1];
                    console.log(currPSI)
                    let psidiv = document.getElementById('psi');
                    let PSILabeldiv = document.getElementById('PSILabel');
                    let pm25div = document.getElementById('pm25')
                    psidiv.innerText = currPSI.value
                    psidiv.style.color = currPSI.valueColor
                    psidiv.style.borderColor = currPSI.valueColor
                    psidiv.style.fontSize = '30px';
                    pm25div.innerText = `pm2.5: ${curr25.value}`
                    pm25div.style.color = curr25.valueColor
                    PSILabeldiv.style.color = currPSI.valueColor
                });
            }
        )
        .catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
}
