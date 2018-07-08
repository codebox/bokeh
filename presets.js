const presets = (() => {
    function pickRandom(...items) {
        return items[Math.floor(Math.random() * items.length)]
    }

    function pickRandomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    function xyz(x=0,y=0,z=0){
        return {x,y,z};
    }

    return {
        'Snow' : {
            setParams(params) {
                params.radius = 20;
                params.rate = 5;
                params.perspective = 0.05;
                params.blur = 0.75;
                params.colourFade = 0.8;
                params.fade = 0.1;
                params.edgeBrightness = 0.25;
                params.focalDistance = 0.3;
                params.alphaFactor = 0.9;
            },
            build() {
                return env => {
                    const
                        position = {
                            x: pickRandomRange(-50, 50),
                            y: -50,
                            z: pickRandomRange(0, -50)
                        },
                        speed = {
                            x: 0,
                            y: 0,
                            z: 0
                        },
                        acceleration = {
                            x: 0,
                            y: 10,
                            z: 0
                        };

                    env.addLight({h:180,l:100}, position, speed, acceleration, () => {});
                };
            }
        },
        'Slow Rainbow' : {
            setParams(params) {
                params.radius = 50;
                params.rate = 1;
                params.perspective= 0.1;
                params.blur = 0.75;
                params.colourFade = 0.8;
                params.fade = 0.1;
                params.edgeBrightness = 0.25;
                params.focalDistance = 0.3;
                params.alphaFactor = 0.8;
            },
            build() {
                let nextHue = 0;

                return env => {
                    const
                        position = {
                            x: -50,
                            y: pickRandomRange(-50, 50),
                            z: pickRandomRange(0, -50)
                        },
                        speed = {
                            x: pickRandomRange(5,20),
                            y: 0,
                            z: 0
                        },
                        acceleration = {
                            x: 0,
                            y: 0,
                            z: 0
                        };

                    function flicker(x, y, z, t) {
                        return Math.abs(Math.floor(x*20) % 100) === 1;
                    }

                    nextHue = (nextHue + 5) % 360;
                    env.addLight({h:nextHue,l:50}, position, speed, acceleration, flicker);
                };
            }
        },
        'Traffic' : {
            setParams(params) {
                params.radius = 30;
                params.rate = 1;
                params.perspective= 0.05;
                params.blur = 0.75;
                params.colourFade = 0;
                params.fade = 1;
                params.edgeBrightness = 0.25;
                params.focalDistance = 0.3;
                params.alphaFactor = 1;
            },
            build() {

                return env => {
                    function buildFlicker() {
                        return function(x, y, z, t) {
                            return Math.abs(Math.floor(x*20) % Math.floor(pickRandomRange(50,100))) === 1;
                        }
                    }

                    const direction = Math.random() > 0.5 ? 1 : -1;
                    env.addLight({h: pickRandomRange(0,80), l: 90}, {
                        x: 50 * direction,
                        y: pickRandomRange(-5, 5),
                        z: pickRandomRange(0, -100)
                    }, {
                        x: -pickRandomRange(2,8) * direction,
                        y: 0,
                        z: 0
                    }, {
                        x: 0,
                        y: 0,
                        z: 0
                    }, buildFlicker());
                };
            }
        }
    };

})();