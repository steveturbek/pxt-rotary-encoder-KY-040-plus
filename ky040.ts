enum EncoderEvent {
    //% block="clockwise"
    Clockwise = 0,
    //% block="counter clockwise"
    CounterClockwise = 1,
    //% block="button pressed"
    ButtonPress = 2
}

enum EncoderID {
    //% block="RotaryEncoder 1"
    E1 = 1,
    //% block="RotaryEncoder 2"
    E2 = 2,
    //% block="RotaryEncoder 3"
    E3 = 3
}

//% color=50 weight=80
//% icon="\uf01e"
namespace RotaryEncoder {

    class EncoderState {
        clkPin: DigitalPin;
        dtPin: DigitalPin;
        swPin: DigitalPin;
        lastPressed: number;
        rotateReady: boolean;
        pressedID: number;
        rotatedClockwiseID: number;
        rotatedCounterClockwiseID: number;

        constructor(id: EncoderID) {
            this.lastPressed = 1;
            this.rotateReady = true;
            const base = 5600 + (id - 1) * 3;
            this.pressedID = base;
            this.rotatedClockwiseID = base + 1;
            this.rotatedCounterClockwiseID = base + 2;
        }
    }

    let encoders: EncoderState[] = [];

    function getEncoder(id: EncoderID): EncoderState {
        const idx = id - 1;
        if (!encoders[idx]) encoders[idx] = new EncoderState(id);
        return encoders[idx];
    }

    /**
     * Initialises the rotary encoder and starts polling its pins.
     */
    //% blockId=rotary_ky_init
    //% block="connect %id clk %clk|dt %dt|sw %sw"
    //% icon="\uf1ec"
    export function init(id: EncoderID, clk: DigitalPin, dt: DigitalPin, sw: DigitalPin): void {
        const enc = getEncoder(id);
        enc.clkPin = clk;
        enc.dtPin = dt;
        enc.swPin = sw;

        pins.setPull(clk, PinPullMode.PullUp);
        pins.setPull(dt, PinPullMode.PullUp);
        pins.setPull(sw, PinPullMode.PullUp);

        control.inBackground(() => {
            while (true) {
                const riValue = pins.digitalReadPin(enc.clkPin);
                const dvValue = pins.digitalReadPin(enc.dtPin);
                if (riValue == 1 && dvValue == 1) enc.rotateReady = true;
                else if (enc.rotateReady) {
                    if (riValue == 1 && dvValue == 0) {
                        enc.rotateReady = false;
                        control.raiseEvent(enc.rotatedCounterClockwiseID, EncoderEvent.CounterClockwise);
                    } else if (riValue == 0 && dvValue == 1) {
                        enc.rotateReady = false;
                        control.raiseEvent(enc.rotatedClockwiseID, EncoderEvent.Clockwise);
                    }
                }
                basic.pause(5);
            }
        });

        control.inBackground(() => {
            while (true) {
                const pressed = pins.digitalReadPin(enc.swPin);
                if (pressed != enc.lastPressed) {
                    enc.lastPressed = pressed;
                    if (pressed == 0) control.raiseEvent(enc.pressedID, 0);
                }
                basic.pause(50);
            }
        });
    }

    /**
     * Run code when the rotary encoder rotates or the button is pressed.
     */
    //% blockId=rotary_ky_event
    //% block="on %id %event"
    export function onEvent(id: EncoderID, event: EncoderEvent, body: () => void): void {
        const enc = getEncoder(id);
        if (event == EncoderEvent.Clockwise) control.onEvent(enc.rotatedClockwiseID, EncoderEvent.Clockwise, body);
        if (event == EncoderEvent.CounterClockwise) control.onEvent(enc.rotatedCounterClockwiseID, EncoderEvent.CounterClockwise, body);
        if (event == EncoderEvent.ButtonPress) control.onEvent(enc.pressedID, 0, body);
    }
}
