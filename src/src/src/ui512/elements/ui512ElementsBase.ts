
/* auto */ import { assertTrue } from '../../ui512/utils/utilsAssert.js';
/* auto */ import { ChangeContext } from '../../ui512/draw/ui512Interfaces.js';
/* auto */ import { UI512Settable } from '../../ui512/elements/ui512ElementsGettable.js';

/**
 * base class for UI model classes (button, label, etc)
 */
export abstract class UI512Element extends UI512Settable {
    readonly typename: string = 'UI512Element';
    public transparentToClicks = false;
    protected _visible = true;
    protected _enabled = true;
    protected _enabledstyle = true;
    protected _x = 0;
    protected _y = 0;
    protected _w = 0;
    protected _h = 0;

    /* simply a quick way to set x, y, w, and h in one line */
    setDimensions(newX: number, newY: number, neww: number, newh: number, context = ChangeContext.Default) {
        assertTrue(neww >= 0, `2 |width must be >= 0 but got ${neww}`);
        assertTrue(newh >= 0, `2z|height must be >= 0 but got ${newh}`);
        this.set('x', newX, context);
        this.set('y', newY, context);
        this.set('w', neww, context);
        this.set('h', newh, context);
    }

    /* instead of setting by width and height, set by x1 and y1. */
    setDimensionsX1Y1(newX0: number, newY0: number, newX1: number, newY1: number, context = ChangeContext.Default) {
        this.setDimensions(newX0, newY0, newX1 - newX0, newY1 - newY0);
    }

    /* a few getters for convenience */
    get enabled() {
        return this._enabled;
    }
    get visible() {
        return this._visible;
    }
    get x() {
        return this.get_n('x');
    }
    get y() {
        return this.get_n('y');
    }
    get w() {
        return this.get_n('w');
    }
    get h() {
        return this.get_n('h');
    }
    get bottom() {
        return this.y + this.h;
    }
    get right() {
        return this.x + this.w;
    }
}

/**
 * an element that has a text label
 */
export abstract class UI512ElementWithText extends UI512Element {
    protected _labeltext = '';
    protected _labelvalign = true;
    protected _labelhalign = true;
    protected _labelwrap = false;
}

/**
 * an element that can show an icon and be highlighted
 */
export abstract class UI512ElementWithHighlight extends UI512ElementWithText {
    protected _highlightactive = false;
    protected _autohighlight = true;
    protected _checkmark = false;
    protected _icongroupid = '';
    protected _iconnumber = -1;
    protected _iconnumberwhenhighlight = -1;
    protected _iconadjustx = 0;
    protected _iconadjusty = 0;
    protected _iconadjustwidth = 0;
    protected _iconadjustheight = 0;
    protected _iconadjustsrcx = 0;
    protected _iconadjustsrcy = 0;
    protected _iconcentered = true;
}
