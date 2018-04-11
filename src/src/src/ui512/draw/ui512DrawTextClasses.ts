
/* auto */ import { assertTrue, makeUI512Error, scontains } from '../../ui512/utils/utilsAssert.js';
/* auto */ import { base10 } from '../../ui512/utils/utilsUI512.js';

/* Bitmap-font-drawing
Extraction and rendering by Ben Fisher, 2017 */

/* we assign our own meaning to certain rarely-used charcodes. */
export const specialCharOnePixelSpace = '\x01';
export const specialCharFontChange = '\x02';
export const specialCharZeroPixelChar = '\x03';
export const specialCharCmdSymbol = '\xBD';

/* small perf optimization so that we're not always calling charCodeAt */
export const specialCharNumNewline = '\n'.charCodeAt(0);
export const specialCharNumZeroPixelChar = specialCharZeroPixelChar.charCodeAt(0);
export const specialCharNumOnePixelSpace = specialCharOnePixelSpace.charCodeAt(0);
export const specialCharNumFontChange = specialCharFontChange.charCodeAt(0);
export const specialCharNumCmdSymbol = specialCharCmdSymbol.charCodeAt(0);
export const specialCharNumTab = '\t'.charCodeAt(0);
export const largeArea = 1024 * 1024 * 1024;
const space = ' '.charCodeAt(0);
const dash = '-'.charCodeAt(0);

/* nbsp in the os-roman character set */
export const specialCharNonBreakingSpace = '\xCA';
export const specialCharNumNonBreakingSpace = specialCharNonBreakingSpace.charCodeAt(0);

/**
 * metadata returned after a single character has been drawn.
 */
export class DrawCharResult {
    constructor(public newLogicalX: number, public rightmostPixelDrawn: number, public lowestPixelDrawn: number) {}
    update(drawn: DrawCharResult) {
        this.lowestPixelDrawn = Math.max(this.lowestPixelDrawn, drawn.lowestPixelDrawn);
        this.rightmostPixelDrawn = Math.max(this.rightmostPixelDrawn, drawn.rightmostPixelDrawn);
        this.newLogicalX = drawn.newLogicalX;
    }
}

/**
 * each font has a large bitmap image with every character
 * a grid object is necessary to specify the width and height of the characters --
 * these are bitmap fonts (not vector) but letters still have varying widths.
 */
export class UI512FontGrid {
    metrics: UI512FontMetrics;
    image: HTMLImageElement;
    loadedMetrics = false;
    loadedImage = false;
    spec: TextFontSpec;
    adjustSpacing = 0;

    freeze() {
        if (this.loadedImage && this.loadedMetrics) {
            Object.freeze(this.metrics);
            Object.freeze(this.spec);
            Object.freeze(this);
        }
    }

    getLineHeight() {
        if (!this.metrics || !this.metrics.lineheight) {
            throw makeUI512Error(
                `3U|invalid metrics for font ${this.spec.typefacename} ${this.spec.size} ${this.spec.style}`
            );
        }

        return this.metrics.lineheight;
    }

    getCapHeight() {
        if (!this.metrics || !this.metrics.capHeight) {
            throw makeUI512Error(
                `3T|invalid metrics for font ${this.spec.typefacename} ${this.spec.size} ${this.spec.style}`
            );
        }

        return this.metrics.capHeight;
    }
}

/**
 * internal structure of json font metrics, as generated by the python script
 */
interface UI512FontMetrics {
    version: string;
    lineheight: number;
    leftmost: number;
    bounds: (number | number[])[];
    widestlogicalchar: number;
    widestglyph: number;
    tallestglyph: number;
    capHeight: number;
}

/**
 * a complete font, ready to be drawn.
 */
export class TextRendererFont {
    underline = false;
    condense = false;
    extend = false;
    constructor(public readonly grid: UI512FontGrid) {}
}

/**
 * when drawing a textfield, in effect we divide it into regions
 * a CharRectType.Char region is within the box of a character that was drawn.
 * a CharRectType.SpaceToLeft region is in the left margin of the text field.
 *  (this margin is typically narrow, but can be large if field is horizontal-aligned)
 * a CharRectType.SpaceToRight region is in the right margin of the text field.
 */
export enum CharRectType {
    __isUI512Enum = 1,
    Char,
    SpaceToLeft,
    SpaceToRight
}

/**
 * results finding which character was hit by x,y coordinates
 */
export class FoundCharByLocation {
    constructor(
        public x: number,
        public y: number,
        public w: number,
        public h: number,
        public charIndex: number,
        public type: CharRectType,
        public reserved: number
    ) {}
}

/**
 * bit field for font styling.
 * use bitwise operations, e.g. bold and italic is (bold|italic)
 */
export enum TextFontStyling {
    Default = 0,
    Bold = 1 << 0,
    Italic = 1 << 1,
    Underline = 1 << 2,
    Outline = 1 << 3,
    Shadow = 1 << 4,
    Disabled = 1 << 5,
    Condensed = 1 << 6,
    Extend = 1 << 7
}

/**
 * serialize TextFontStyling to a string.
 */
export function textFontStylingToString(e: TextFontStyling): string {
    let ret = '';
    ret += e & TextFontStyling.Bold ? '+b' : 'b';
    ret += e & TextFontStyling.Italic ? '+i' : 'i';
    ret += e & TextFontStyling.Underline ? '+u' : 'u';
    ret += e & TextFontStyling.Outline ? '+o' : 'o';
    ret += e & TextFontStyling.Shadow ? '+s' : 's';
    ret += e & TextFontStyling.Disabled ? '+d' : 'd';
    ret += e & TextFontStyling.Condensed ? '+c' : 'c';
    ret += e & TextFontStyling.Extend ? '+e' : 'e';
    return ret;
}

/**
 * deserialize TextFontStyling from a string.
 */
export function stringToTextFontStyling(s: string): TextFontStyling {
    let ret = TextFontStyling.Default;
    for (let i = 0; i < s.length - 1; i++) {
        if (s.charAt(i) === '+') {
            switch (s.charAt(i + 1)) {
                case 'b':
                    ret |= TextFontStyling.Bold;
                    break;
                case 'i':
                    ret |= TextFontStyling.Italic;
                    break;
                case 'u':
                    ret |= TextFontStyling.Underline;
                    break;
                case 'o':
                    ret |= TextFontStyling.Outline;
                    break;
                case 's':
                    ret |= TextFontStyling.Shadow;
                    break;
                case 'd':
                    ret |= TextFontStyling.Disabled;
                    break;
                case 'c':
                    ret |= TextFontStyling.Condensed;
                    break;
                case 'e':
                    ret |= TextFontStyling.Extend;
                    break;
                default:
                    console.log(`warning: unrecognized text style ${s}`);
                    break;
            }
        }
    }
    return ret;
}

/**
 * when strings are persisted to disk, use the font name "geneva"
 * when loading font from json, use font id as a number.
 */
function typefacenameToTypefaceId(s: string): string {
    switch (s.toLowerCase().replace(/%20/g, ' ')) {
        case 'chicago':
            return '00';
        case 'courier':
            return '01';
        case 'geneva':
            return '02';
        case 'new york':
            return '03';
        case 'times':
            return '04';
        case 'helvetica':
            return '05';
        case 'monaco':
            return '06';
        case 'symbol':
            return '07';
        default:
            return '00';
    }
}

/**
 * from geneva_x_y to 02_x_y
 */
export function typefacenameToTypefaceIdFull(s: string): string {
    let face = TextFontSpec.getTypeface(s);
    return TextFontSpec.setTypeface(s, typefacenameToTypefaceId(face));
}

/**
 * serialize+deserialize a font spec, which currently consists of
 * 1) typeface name
 * 2) size
 * 3) style
 */
export class TextFontSpec {
    constructor(public typefacename: string, public style: TextFontStyling, public size: number) {}
    static fromString(s: string) {
        let parts = s.split('_');
        let typefacename = parts[0];
        let size = parseInt(parts[1], base10);
        let style = stringToTextFontStyling(parts[2]);
        return new TextFontSpec(typefacename, style, size);
    }

    toSpecString() {
        let ret = this.typefacename + '_';
        ret += this.size.toString() + '_';
        ret += textFontStylingToString(this.style);
        return ret;
    }

    static getTypeface(s: string) {
        return s.split('_')[0];
    }

    static getFontSize(s: string) {
        return s.split('_')[1];
    }

    static getFontStyle(s: string) {
        return s.split('_')[2];
    }

    static setTypeface(s: string, snext: string) {
        let parts = s.split('_');
        assertTrue(!scontains(snext, '_'), '3X|parts of a font cannot contain the "_" character');
        return [snext, parts[1], parts[2]].join('_');
    }

    static setFontSize(s: string, snext: string) {
        let parts = s.split('_');
        assertTrue(!scontains(snext, '_'), '3W|parts of a font cannot contain the "_" character');
        return [parts[0], snext, parts[2]].join('_');
    }

    static setFontStyle(s: string, snext: string) {
        let parts = s.split('_');
        assertTrue(!scontains(snext, '_'), '3V|parts of a font cannot contain the "_" character');
        return [parts[0], parts[1], snext].join('_');
    }
}
