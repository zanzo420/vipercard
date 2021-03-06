
/* auto */ import { checkThrow, scontains } from '../../ui512/utils/utilsAssert.js';
/* auto */ import { Util512, ValHolder } from '../../ui512/utils/utils512.js';
/* auto */ import { NullaryFn, UI512BeginAsyncIgnoreFailures } from '../../ui512/utils/utilsTestCanvas.js';

/**
 * support the "play" command in vipercard
 */
export class VpcAudio {
    static isLoaded: { [key: string]: boolean } = {};

    /**
     * get url for a sound
     */
    static urlFromKey(key: string) {
        checkThrow(!scontains(key, '/'), 'K8|');
        checkThrow(!scontains(key, '\\'), 'K7|');
        checkThrow(key.match(/^[A-Za-z0-9_-]+$/), 'K6|');
        return `/resources/sound/${key}.mp3`;
    }

    /**
     * preload the sound, so that it will be
     * downloaded in the background and ready when needed
     * asynchronous
     *
     * note: safari seems to not let the sound work, as the audio element hasn't been 'interacted' with.
     */
    static preload(key: string) {
        if (!VpcAudio.isLoaded[key]) {
            let span = window.document.createElement('span');
            span.setAttribute('id', 'vpcaudiospan' + key);
            let url = VpcAudio.urlFromKey(key);

            span.innerHTML = `<audio class="notvisible" preload="auto" volume="0.2" id="vpcaudiohtmlel${key}">
            <source src="${url}" type="audio/mpeg" autoplay="0" autostart="0" volume="0.2" preload="auto"></audio>`;
            window.document.body.appendChild(span);
            VpcAudio.isLoaded[key] = true;
        }
    }

    /**
     * play the sound
     * asynchronous
     * will interrupt a sound that is currently playing
     */
    static play(key: string) {
        let aud = window.document.getElementById('vpcaudiohtmlel' + key) as HTMLAudioElement;
        if (aud) {
            aud.currentTime = 0;
            UI512BeginAsyncIgnoreFailures(() => aud.play());
            return true;
        } else {
            return false;
        }
    }

    /**
     * play system beep sound
     */
    static beep() {
        let aud = window.document.getElementById('vpcinitialaudio') as HTMLAudioElement;
        if (aud) {
            aud.currentTime = 0;
            UI512BeginAsyncIgnoreFailures(() => aud.play());
        }
    }
}

/**
 * support the "dial" command in vipercard
 */
export class VpcPhoneDial {
    /**
     * dials a number, and call cbWhenComplete when complete
     */
    static goDial(s:string, cbWhenComplete:NullaryFn) {
        let alreadyRun = new ValHolder(false)
        let runCallbackUnlessAlreadyRun = () => {
            if (!alreadyRun.val) {
                cbWhenComplete()
                alreadyRun.val = true
            }
        }

        /* fail-safe: continue running the script in 5 seconds even if everything else fails */
        let fiveSeconds = 5 * 1000
        window.setTimeout(runCallbackUnlessAlreadyRun, fiveSeconds)

        /* preload, so we'll at least have them available for next time */
        for (let i=0; i<10; i++) {
            let filename = `dial${i}`
            VpcAudio.preload(filename)
        }

        /* start playback */
        let padding = 30
        let arr = VpcPhoneDial.intoArray(s)
        if (!arr.length) {
            window.setTimeout(runCallbackUnlessAlreadyRun, 1)
            return
        }

        /* schedule playing each tone */
        let durations = arr.map(n=>VpcPhoneDial.mapDialDurations[n] + padding)
        for (let i=0; i<arr.length; i++) {
            let timeAt = durations.slice(0, i+1).reduce(Util512.add)
            let filename = `dial${arr[i]}`
            window.setTimeout(()=>VpcAudio.play(filename), timeAt)
        }

        /* schedule returing to the script */
        let totalTime = durations.reduce(Util512.add) + 500
        window.setTimeout(runCallbackUnlessAlreadyRun, totalTime)
    }

    /**
     * from '123' to [1,2,3]
     */
    protected static intoArray(s:string):number[] {
        let ret:number[] = []
        for (let i=0; i<s.length; i++) {
            if (s.charCodeAt(i) >= '0'.charCodeAt(0) && s.charCodeAt(i) <= '9'.charCodeAt(0)) {
                ret.push(s.charCodeAt(i) - '0'.charCodeAt(0))
            }
        }

        return ret
    }

    /**
     * durations in milliseconds of the sounds
     */
    static mapDialDurations:{ [key: number]:number} = {
        0: 261,
        1: 261,
        2: 235,
        3: 287,
        4: 287,
        5: 313,
        6: 313,
        7: 235,
        8: 313,
        9: 313
    }
}
