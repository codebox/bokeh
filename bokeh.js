const colourHues = {
    red: 0,
    green: 128,
    blue: 230,
    yellow: 60,
    pink: 300,
    purple: 280,
    orange: 30
};

function pickRandom(...items) {
    return items[Math.floor(Math.random() * items.length)]
}

function pickRandomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function buildCircle(container) {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.borderStyle = 'solid';

    container.appendChild(div);

    const borderColorAlpha = 1, backgroundColorAlpha = 0.7;
    let x, y, hidden, zIndex, radius, borderWidth, borderColor, backgroundColor, blur, alpha;

    return {
        get x() {
            return x;
        },
        set x(value) {
            x = value;
        },

        get y() {
            return y;
        },
        set y(value) {
            y = value;
        },

        get zIndex() {
            return zIndex;
        },
        set zIndex(value) {
            zIndex = value;
        },

        get hidden() {
            return hidden;
        },
        set hidden(value) {
            hidden = value;
        },

        get radius() {
            return radius;
        },
        set radius(value) {
            radius = value;
        },

        get borderWidth() {
            return borderWidth;
        },
        set borderWidth(value) {
            borderWidth = value;
        },

        get borderColor() {
            return borderColor;
        },
        set borderColor(value) {
            borderColor = value;
        },

        get backgroundColor() {
            return backgroundColor;
        },
        set backgroundColor(value) {
            backgroundColor = value;
        },

        get blur() {
            return blur;
        },
        set blur(value) {
            blur = value;
        },

        get alpha() {
            return alpha;
        },
        set alpha(value) {
            alpha = value;
        },

        applyStyles() {
            Object.assign(div.style, {
                left : `${x-radius}px`,
                top : `${y-radius}px`,
                zIndex : `${zIndex}`,
                display : hidden ? 'none' : 'block',
                borderRadius : `${radius+borderWidth}px`,
                height : `${radius*2}px`,
                width : `${radius*2}px`,
                borderWidth : `${borderWidth}px`,
                borderColor : `hsla(${borderColor.h},${borderColor.s}%,${borderColor.l}%, ${borderColorAlpha * alpha})`,
                backgroundColor : `hsla(${backgroundColor.h},${backgroundColor.s}%,${backgroundColor.l}%, ${backgroundColorAlpha * alpha})`,
                filter : `blur(${Math.abs(blur)}px)`,
            });
        },

        remove() {
            container.removeChild(div);
            console.log('===== finished')
        }
    };
}

const renderParams = {
    radius : 50,
    rate : 0.3,
    perspective: 0.5,
    blur : 5,
    colourFade : 80,
    fade: 10,
    edgeBrightness : 2,
    focalDistance : 50,
    vanishingPoint : 100
};

function buildRenderer(container) {
    function transformCoords(pos3d) {
        /*
            +y ^
               |  -z
               | /
               |/
      -x <-----0------> +x
              /|
             / |
           +z  |
               -y
     */

        return {
            x: pos3d.x/(-pos3d.z * renderParams.perspective),
            y:pos3d.y/(-pos3d.z * renderParams.perspective)
        }
    }

    let containerElementWidth, containerElementHeight;

    const renderer = {
        checkContainerSize() {
            containerElementWidth = container.element.getBoundingClientRect().width;
            containerElementHeight = container.element.getBoundingClientRect().height;
        },
        render(light) {
            const distance = -light.position.z,
                circle = light.circle,
                xOffset = containerElementWidth/2,
                xFactor = containerElementWidth / container.width,
                yFactor = containerElementHeight / container.height,
                yOffset = containerElementHeight/2,
                distanceFactor = 1 - (container.depth - distance) / container.depth,  // 0 - close, 1 - far
                coords = transformCoords(light.position);

            circle.radius = renderParams.radius;
            circle.x = coords.x * xFactor + xOffset;
            circle.y = coords.y * yFactor + yOffset;
            circle.zIndex = Math.round(10 + (container.depth + light.position.z));

            circle.borderColor = {
                h : light.hue,
                s : 100 - renderParams.colourFade * distanceFactor,
                l : 50 - renderParams.fade * distanceFactor * renderParams.edgeBrightness
            };
            circle.backgroundColor = {
                h : light.hue,
                s : 100 - renderParams.colourFade * distanceFactor,
                l : 50 - renderParams.fade * distanceFactor
            };
            circle.blur = renderParams.blur * Math.abs((distance - renderParams.focalDistance) / container.depth);
            circle.hidden = light.hidden;

            if (light.fadeOut) {
                circle.alpha *= 0.98;
            } else {
                circle.alpha = 1-distanceFactor;
            }
            circle.applyStyles();
        }
    };

    renderer.checkContainerSize();

    setInterval(renderer.checkContainerSize, 1000);

    return renderer;
}

function buildEnvironment(container = document.body, width = 100, height = 100, depth = 100) {
    const lights = [],
        renderer = buildRenderer({element : container, width, height, depth});

    let frameRequestId;

    function updateLight(light, now) {
        const millisSinceLast = now - light.lastUpdate;

        light.speed.x += light.acceleration.x * millisSinceLast / 1000;
        light.speed.y += light.acceleration.y * millisSinceLast / 1000;
        light.speed.z += light.acceleration.z * millisSinceLast / 1000;

        light.position.x += light.speed.x * millisSinceLast / 1000;
        light.position.y += light.speed.y * millisSinceLast / 1000;
        light.position.z += light.speed.z * millisSinceLast / 1000;

        light.fadeOut = light.fadeOut ||
            (light.position.x < -width/2 && light.speed.x < 0) ||
            (light.position.x >  width/2 && light.speed.x > 0) ||
            (light.position.y < -width/2 && light.speed.y < 0) ||
            (light.position.y >  width/2 && light.speed.y > 0) ||
            (light.position.z >= 0);

        light.hidden = light.position.z >= 0 || light.flicker(light.position.x, light.position.y, light.position.z, now);

        light.lastUpdate = Date.now();
    }

    function render() {
        const now = Date.now();

        lights.forEach((light, index) => {
            updateLight(light, now);

            if (light.fadeOut && !light.timer) {
                const FADEOUT_TIME_SECS = 3;
                light.timer = setTimeout(() => {
                    light.circle.remove();
                    lights.splice(lights.indexOf(light), 1);
                }, FADEOUT_TIME_SECS * 1000);
            } else {
                renderer.render(light);
            }
        });

        frameRequestId = requestAnimationFrame(render);
    }

    return {
        start() {
            frameRequestId = requestAnimationFrame(render);
        },

        stop() {
            cancelAnimationFrame(frameRequestId);
        },

        addLight(hue, position, speed, acceleration, flicker) {
            const circle = buildCircle(container);
            circle.borderWidth = 2;

            const light = {
                hue, position, speed, acceleration, flicker,
                lastUpdate : Date.now(),
                circle
            };
            lights.push(light);
            return light;
        },

        width,
        height,
        depth,
        radius
    };
}

const bokehEl = document.querySelector('#bokeh');
const env = buildEnvironment(bokehEl);
env.start();

function setupControls(params) {
    function setupControl(name) {
        const slider = document.querySelector(`#${name}`),
            display = document.querySelector(`#${name}Value`);

        slider.value = display.innerHTML = renderParams[name];
        slider.addEventListener('input', () => {
            renderParams[name] = Number(display.innerHTML = slider.value);
        });
    }

    setupControl('radius');
    setupControl('rate');
    setupControl('perspective');
    setupControl('blur');
    setupControl('colourFade');
    setupControl('fade');
    setupControl('edgeBrightness');
    setupControl('focalDistance');
    setupControl('vanishingPoint');
}

function setupLightTimer() {
    function newLight() {
        const
            hue = Math.round(pickRandomRange(0, 360)),
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
            return Math.floor(x*20) % 100 === 1;
        }

        env.addLight(pickRandomRange(150,220), position, speed, acceleration, flicker);
        setTimeout(newLight, 1000 / renderParams.rate);
    };
    newLight();
}

function setupFullScreen() {
    const goFullScreen = container.requestFullscreen || container.webkitRequestFullscreen || container.mozRequestFullScreen;
    if (goFullScreen) {
        const fullScreenIcon = document.querySelector('.fullScreenIcon');
        fullScreenIcon.style.display = 'inline';
        fullScreenIcon.onclick = goFullScreen.bind(bokehEl);
    }
}

setupControls(renderParams);
setupFullScreen();
setupLightTimer();