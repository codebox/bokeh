function buildCircle(container) {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.borderStyle = 'solid';

    container.appendChild(div);

    let x, y, hidden, zIndex, radius, borderWidth, borderColor, backgroundColor, blur, alpha, borderAlpha, lastStyleValues = {};

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

        get borderAlpha() {
            return borderAlpha;
        },
        set borderAlpha(value) {
            borderAlpha = value;
        },

        applyStyles() {
            const newStyleValues = {
                left : `${x-radius}px`,
                top : `${y-radius}px`,
                zIndex : `${zIndex}`,
                display : hidden ? 'none' : 'block',
                borderRadius : `${radius+borderWidth}px`,
                height : `${radius*2}px`,
                width : `${radius*2}px`,
                borderWidth : `${borderWidth}px`,
                borderColor : `hsla(${borderColor.h},${borderColor.s}%,${borderColor.l}%, ${borderAlpha})`,
                backgroundColor : `hsla(${backgroundColor.h},${backgroundColor.s}%,${backgroundColor.l}%, ${alpha})`,
                filter : `blur(${Math.abs(blur)}px)`,
            }, changedStyleValues = {};

            Object.keys(newStyleValues).forEach(key => {
                if (lastStyleValues[key] !== newStyleValues[key]){
                    changedStyleValues[key] = newStyleValues[key];
                }
            });
            lastStyleValues = newStyleValues;
            Object.assign(div.style, changedStyleValues);
        },

        remove() {
            container.removeChild(div);
        }
    };
}

const renderParams = {
    radius : 50,
    rate : 1,
    perspective: 0.1,
    blur : 0.75,
    colourFade : 0.8,
    fade: 0.1,
    edgeBrightness : 0.25,
    focalDistance : 0.3,
    alphaFactor : 0.8
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
                coords = transformCoords(light.position),
                MAX_BLUR = 20,
                BASE_Z_INDEX = 10,
                BACKGROUND_ALPHA_DECAY = 0.98,
                BORDER_ALPHA_DECAY = 0.95;

            circle.radius = renderParams.radius;
            circle.x = coords.x * xFactor + xOffset;
            circle.y = coords.y * yFactor + yOffset;
            circle.zIndex = Math.round(BASE_Z_INDEX + (container.depth + light.position.z));

            circle.borderColor = {
                h : light.colour.hue,
                s : 100 * (1 - renderParams.colourFade * distanceFactor),
                l : light.colour.lightness * (1 - renderParams.fade * distanceFactor )
            };
            circle.backgroundColor = {
                h : light.colour.hue,
                s : 100 * (1 - renderParams.colourFade * distanceFactor),
                l : light.colour.lightness * (1 - renderParams.fade * distanceFactor)
            };
            circle.blur = MAX_BLUR * renderParams.blur * Math.abs((distance - container.depth * renderParams.focalDistance) / container.depth);
            circle.hidden = light.hidden;

            if (light.fadeOut) {
                circle.alpha *= BACKGROUND_ALPHA_DECAY;
                circle.borderAlpha *= BORDER_ALPHA_DECAY;
            } else {
                circle.alpha = (1 - distanceFactor) * renderParams.alphaFactor;
                circle.borderAlpha = renderParams.edgeBrightness * renderParams.alphaFactor;
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

        clearLights() {
            lights.forEach(light => {
                light.circle.remove();
                if (light.timer) {
                    clearTimeout(light.timer);
                }
            });
            lights.length = 0;
        },

        addLight(colour, position, speed, acceleration, flicker) {
            const circle = buildCircle(container);
            circle.borderWidth = 2;

            const light = {
                colour: {
                    hue: colour.h,
                    lightness: colour.l
                },
                position, speed, acceleration, flicker,
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
let currentTimer;

env.start();

function setupControls() {
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
    setupControl('alphaFactor');
}

function setupLightTimer(preset) {
    if (currentTimer) {
        currentTimer.stop();
    }
    env.clearLights();

    preset.setParams(renderParams);
    setupControls();

    const newLight = preset.build().bind(preset);

    let stop = false;
    function makeNewLight(){
        if (stop) {
            return;
        }
        newLight(env);

        setTimeout(() => {
            makeNewLight();
        }, 1000 / renderParams.rate);
    }
    makeNewLight();
    currentTimer = {
        stop() {
            stop = true;
        }
    }
}

function setupFullScreen() {
    const goFullScreen = container.requestFullscreen || container.webkitRequestFullscreen || container.mozRequestFullScreen;
    if (goFullScreen) {
        const fullScreenIcon = document.querySelector('.fullScreenIcon');
        fullScreenIcon.style.display = 'inline';
        fullScreenIcon.onclick = goFullScreen.bind(bokehEl);
    }
}

function setupPresets(){
    const ul = document.querySelector('#presets ul');
    Object.keys(presets).forEach(name => {
        const li = document.createElement('li'),
            a = document.createElement('a');
        li.appendChild(a);
        a.innerHTML = name;
        a.addEventListener('click', () => {
            setupLightTimer(presets[name]);
        });
        ul.appendChild(li)
    });
}

setupControls();
setupFullScreen();
setupPresets();
setupLightTimer(presets.Snow);