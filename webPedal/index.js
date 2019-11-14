let canvas = document.getElementById("wave");
var canvasCtx = canvas.getContext("2d");
const WIDTH = 200;
const HEIGHT = 100

function clicky() {
    var input = new Pizzicato.Sound({
        source: 'input',
        options: { volume: 0.8 }
    },
        (error) => {
            if (!error) {
                console.log('input ready')
                // playSound();
                input.play();
            }
    });
}

function playSound() {
    console.log('test');
    const analyser = Pizzicato.context.createAnalyser();
    input.connect(analyser);
    console.log(input);
    if (input.playing) {
        input.pause();
        document.getElementById("playbutton").innerHTML = "play"
    } else {
        input.play();
        document.getElementById("playbutton").innerHTML = "pause"
    }
    draw();

    function draw() {
        analyser.fftSize = 2048;
        var bufferLength = analyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);
        var drawVisual = requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);
        canvasCtx.fillStyle = 'rgb(200, 200, 200)';
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
        canvasCtx.beginPath();
        var sliceWidth = WIDTH * 1.0 / bufferLength;
        var x = 0;
        for (var i = 0; i < bufferLength; i++) {

            var v = dataArray[i] / 128.0;
            var y = v * HEIGHT / 2;

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
    }
}