var debug = function(msg) {
	this.postMessage({ message: "----debug: '" + msg + "'"});
}
var alphaChannels = [],
	yPositions = [],
	data = {};
	
var calculations = function() {
	var iteration = 0;
	for (var z = 0; z < data.PARTICLE_COUNT_X; z++) {
		for (var x = 0; x < data.PARTICLE_COUNT_Z; x++) {			
			 
			if (alphaChannels[data.currentImage][iteration]) {
				/*if (x % 2) {
					yPositions[iteration] -= 1;
					yPositions[iteration] = Math.max(0, yPositions[iteration])
				} else {
					yPositions[iteration] += 1;
					yPositions[iteration] = Math.min(0, yPositions[iteration])
				}*/
				//yPositions[iteration] += Math.sin(data.timer2 + z / 4 + x / 4) * 1.2;
				yPositions[iteration] = Math.sin(data.timer2 + z / 2 + x / 2) * 1.3 * data.arrayVolume[x * 4 + z] * 0.04 + 50
			} else {
				yPositions[iteration] = (
					(Math.sin((z + data.timer2) / 4) * -Math.cos((x + data.timer2)/ 4)) * 20 + 10
				)
				* (x % 2 ? Math.sin(data.timer1) : Math.cos(data.timer1)) 
				+ (x % 2 ? 30: -30) 
				+ Math.sin(data.arrayVolume[z * 4 + x] / 64) * 10
				
				+ Math.sin((x % 2 ? -1 : 1) * data.timer1) * 30				
				+ Math.cos(x * z) * 20 * Math.cos(Math.PI * 2 - (data.timer1 - Math.PI / 2))
				
				* Math.sin(data.positionMS / 10000) * 2
				
				//+ Math.sin(data.globalVolume / x * z)
			}
			
			
			iteration ++;
			;
		}
	}
	data.timer1 += 0.005;
	data.timer2 += 0.05;
	data.timer3 += 0.0015
	data.globalVolume -= 0.1
	
}

this.addEventListener('message', function(e) {
	var response = function() {
		this.postMessage({ message: "----message received: '" + e.data.operation + "'"});
	},
	
	i = 0
	
	switch (e.data.operation) {
		case "init":
			this.postMessage({ message: "worker initialized" })
			data = e.data.data;
			data.currentImage = 0;
			data.globalVolume = 50;
			data.arrayVolume = new Uint8Array(512)
			break;
		
		case "setCalculator":
			setInterval(function() {
				calculations();
				this.postMessage({ message: "new Table", yPositions: yPositions });
			}, 17);
			break;
			
		case "takeAlpha":
			alphaChannels.push(e.data.alphaData);
			this.postMessage({message: 'alpha length ' + alphaChannels.length});
			break;
		
		case "imageChange":
			data.currentImage = e.data.image;
			break;
		
		case "volumeData":
			
			data.globalVolume = e.data.globalVolume > (data.globalVolume + 10) ? e.data.globalVolume : data.globalVolume;
			for (i; i < 512; i++) {
				data.arrayVolume[i] = 
					e.data.arrayVolume[i] > (data.arrayVolume[i] + 4) 
						? data.arrayVolume[i] + (e.data.arrayVolume[i] - data.arrayVolume[i]) / 8
						: data.arrayVolume[i] - 0.2;
			};
			data.positionMS = e.data.positionMS;
			break;
			
		default:
			
	}
	
}, false);
