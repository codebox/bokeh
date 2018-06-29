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
    let x, y, hidden, zIndex, radius, borderWidth, borderColor, backgroundColor, blur, alphaFactor = 1;

    return {
        get x() {
            return x;
        },
        set x(value) {
            x = value;
            div.style.left = `${x-radius}px`;
        },

        get y() {
            return y;
        },
        set y(value) {
            y = value;
            div.style.top = `${y-radius}px`;
        },

        get zIndex() {
            return zIndex;
        },
        set zIndex(value) {
            zIndex = value;
            div.style.zIndex = `${zIndex}`;
        },

        get hidden() {
            return hidden;
        },
        set hidden(value) {
            hidden = value;
            div.style.display = hidden ? 'none' : 'block';
        },

        get radius() {
            return radius;
        },
        set radius(value) {
            radius = value;
            div.style.borderRadius = `${radius}px`;
            div.style.height=`${radius*2}px`;
            div.style.width=`${radius*2}px`;
        },

        get borderWidth() {
            return borderWidth;
        },
        set borderWidth(value) {
            borderWidth = value;
            div.style.borderWidth = `${borderWidth}px`;
        },

        get alphaFactor() {
            return alphaFactor;
        },
        set alphaFactor(value) {
            alphaFactor = value;
        },

        get borderColor() {
            return borderColor;
        },
        set borderColor(value) {
            borderColor = value;
            div.style.borderColor = `hsla(${borderColor.h},${borderColor.s}%,${borderColor.l}%, ${borderColorAlpha * alphaFactor})`
        },

        get backgroundColor() {
            return backgroundColor;
        },
        set backgroundColor(value) {
            backgroundColor = value;
            div.style.backgroundColor = `hsla(${backgroundColor.h},${backgroundColor.s}%,${backgroundColor.l}%, ${backgroundColorAlpha * alphaFactor})`
        },

        get blur() {
            return blur;
        },
        set blur(value) {
            blur = value;
            div.style.filter=`blur(${Math.abs(blur)}px)`;
        },

        remove() {
            container.removeChild(div);
        }
    };
}

const renderParams = {
    radius : 50,
    rate : 1,
    perspective: 0.5
};

function buildRenderer(container) {
    const MIN_SATURATION = 20,
        MAX_SATURATION = 100,
        MIN_LIGHTNESS = 50,
        MAX_LIGHTNESS = 60,
        MIN_BLUR = -20,
        MAX_BLUR = 0,
        BORDER_LIGHTNESS_FACTOR = 2;

    return {
        render(light) {
            const containerElementWidth = container.element.getBoundingClientRect().width,
                containerElementHeight = container.element.getBoundingClientRect().height,
                distance = light.position.y,
                circle = light.circle,
                minW = containerElementWidth * (1 - renderParams.perspective),
                maxW = containerElementWidth,
                minH = containerElementHeight * (1 - renderParams.perspective),
                maxH = containerElementHeight,
                distanceFactor = 1 - (container.depth - distance) / container.depth,  // 0 - close, 1 - far
                xOffset = (maxW - minW) * distanceFactor / 2,
                xFactor = (maxW - xOffset * 2) / maxW,
                yOffset = (maxH - minH) * distanceFactor / 2,
                yFactor = (maxH - yOffset * 2) / maxH;

            circle.radius = renderParams.radius;
            circle.x = xOffset + xFactor * containerElementWidth * light.position.x / container.width;
            circle.y = yOffset + yFactor * containerElementHeight * (1-light.position.z / container.height);
            circle.zIndex = 10 + (container.depth - light.position.y);

            circle.borderColor = {
                h : light.hue,
                s : MIN_SATURATION + (MAX_SATURATION - MIN_SATURATION) * (1 - distanceFactor),
                l : MIN_LIGHTNESS + (MAX_LIGHTNESS - MIN_LIGHTNESS) * (distanceFactor)
            };
            circle.backgroundColor = {
                h : light.hue,
                s : MIN_SATURATION + (MAX_SATURATION - MIN_SATURATION) * (1 - distanceFactor),
                l : MIN_LIGHTNESS + (MAX_LIGHTNESS - MIN_LIGHTNESS) * (distanceFactor) * BORDER_LIGHTNESS_FACTOR
            };
            circle.blur = MIN_BLUR + (MAX_BLUR - MIN_BLUR) * (1 - distanceFactor);
            circle.hidden = light.hidden;

            if (light.finished) {
                circle.alphaFactor *= 0.98;
            }

        }
    };
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

        light.finished = light.finished ||
            (light.position.x < 0 && light.speed.x < 0) ||
            (light.position.x > width && light.speed.x > 0) ||
            (light.position.y < 0 && light.speed.y < 0) ||
            (light.position.y > depth && light.speed.y > 0) ||
            (light.position.z < 0 && light.speed.z < 0) ||
            (light.position.z > height && light.speed.z > 0);

        light.hidden = light.flicker(light.position.x, light.position.y, light.position.z, now);

        light.lastUpdate = Date.now();
    }

    function render() {
        const now = Date.now();

        lights.forEach((light, index) => {
            updateLight(light, now);

            if (light.finished && !light.timer) {
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
}

function setupLightTimer() {
    function newLight() {
        const
            hue = Math.round(pickRandomRange(0, 360)),
            position = {
                x: pickRandomRange(0, 100),
                y: pickRandomRange(0, 100),
                z: 100
            },
            speed = {
                x: 0,
                y: 0,
                z: 0
            },
            acceleration = {
                x: 0,
                y: 0,
                z: -20
            };

        function flicker(x, y, z, t) {
            return y < 20 && Math.floor(x / 4) % 4 === 1;
        }

        env.addLight(hue, position, speed, acceleration, flicker);
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