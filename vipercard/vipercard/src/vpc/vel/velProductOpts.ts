
/* auto */ import { vpcversion } from '../../config.js';
/* auto */ import { assertTrue, assertTrueWarn, cProductName, checkThrow } from '../../ui512/utils/utilsAssert.js';
/* auto */ import { Util512, checkThrowEq, getEnumToStrOrUnknown, getStrToEnum } from '../../ui512/utils/utils512.js';
/* auto */ import { UI512CursorAccess, UI512Cursors } from '../../ui512/utils/utilsCursors.js';
/* auto */ import { ChangeContext } from '../../ui512/draw/ui512Interfaces.js';
/* auto */ import { UI512Patterns } from '../../ui512/draw/ui512DrawPatterns.js';
/* auto */ import { ElementObserverVal } from '../../ui512/elements/ui512ElementGettable.js';
/* auto */ import { VpcElType, VpcTool } from '../../vpc/vpcutils/vpcEnums.js';
/* auto */ import { PropGetter, PropSetter, PrpTyp } from '../../vpc/vpcutils/vpcRequestedReference.js';
/* auto */ import { VpcElBase } from '../../vpc/vel/velBase.js';
/* auto */ import { VpcElField } from '../../vpc/vel/velField.js';
/* auto */ import { VpcElButton } from '../../vpc/vel/velButton.js';
/* auto */ import { VpcElCard } from '../../vpc/vel/velCard.js';
/* auto */ import { VpcElBg } from '../../vpc/vel/velBg.js';
/* auto */ import { VpcElStack } from '../../vpc/vel/velStack.js';

/**
 * product options class
 *
 * the vel object singleton that can be referred to with code like
 * 'exit to ViperCard'
 * or
 * 'set the cursor to watch'
 * (when you set a global property, you are setting a
 * property on this object.)
 *
 * settings here are undoable, since they are on a vel
 * settings in vpcruntimesettings, on the other hand, are not undoable
 *
 * these are runtime-only settings -- nothing here is persisted during save.
 */
export class VpcElProductOpts extends VpcElBase {
    isVpcElProduct = true;
    allowSetCurrentTool = false;
    allowSetCurrentCard = false;
    protected _itemDel = ',';
    protected _script = VpcElProductOpts.productOptsScript;
    protected _name = `${cProductName}`;
    protected _longname = `Applications:${cProductName} Folder:${cProductName}`;
    constructor(id: string, parentId: string) {
        super(id, parentId);
        VpcElProductOpts.prodInit();
    }

    /* settings that shouldn't be touched directly */
    protected _currentTool = VpcTool.Pencil;
    protected _currentCardId = '';

    /* settings stored here to get an undoable setting */
    protected _optWideLines = false;
    protected _optPaintDrawMult = false;
    protected _currentPattern = UI512Patterns.defaultPattern;
    protected _optPaintLineColor = UI512Patterns.defaultLineColor;
    protected _optPaintFillColor = UI512Patterns.defaultFillColor;
    protected _optUseHostClipboard = true;
    protected _viewingScriptVelId = '';
    protected _selectedVelId = '';
    protected _suggestedIdleRate = '';

    /* cached getters */
    static cachedGetters: { [key: string]: PropGetter<VpcElBase> };

    /* cached setters */
    static cachedSetters: { [key: string]: PropSetter<VpcElBase> };

    /**
     * type of element
     */
    getType() {
        return VpcElType.Product;
    }

    /**
     * set a property
     * add a check allowSetCurrentTool -- the only place that can set currentTool
     * is the _vpcpresenter_ object, since it has special tool clean-up logic
     */
    set(s: string, newVal: ElementObserverVal, context = ChangeContext.Default) {
        assertTrueWarn(s !== 'currentTool' || this.allowSetCurrentTool, 'Jt|');
        assertTrueWarn(s !== 'currentCardId' || this.allowSetCurrentCard, '');
        assertTrue(s !== 'script', "you can't set script of Vpc");
        return super.set(s, newVal, context);
    }

    /**
     * re-use cached getters and setter callback functions for better perf
     */
    startGettersSetters() {
        VpcElProductOpts.prodInit();
        this.getters = VpcElProductOpts.cachedGetters;
        this.setters = VpcElProductOpts.cachedSetters;
    }

    /**
     * define getters
     */
    static prodGetters(getters: { [key: string]: PropGetter<VpcElBase> }) {
        /* many 'properties' here are hard-coded values for backwards-compat only */
        getters['environment'] = [PrpTyp.Str, () => 'development'];
        getters['freesize'] = [PrpTyp.Num, () => 0];
        getters['size'] = [PrpTyp.Num, () => 0];
        getters['stacksinuse'] = [PrpTyp.Str, () => ''];
        getters['suspended'] = [PrpTyp.Bool, () => false];
        getters['version/long'] = [PrpTyp.Str, () => vpcversion];
        getters['version'] = [PrpTyp.Str, () => vpcversion[0] + '.' + vpcversion[1]];
        getters['itemdelimiter'] = [PrpTyp.Str, 'itemDel'];
        getters['cursor'] = [
            PrpTyp.Str,
            (me: VpcElProductOpts) => {
                let curs = UI512CursorAccess.getCursor();
                let ret = getEnumToStrOrUnknown<UI512Cursors>(UI512Cursors, curs);
                return ret.toLowerCase();
            }
        ];
    }

    /**
     * define setters
     */
    static prodSetters(setters: { [key: string]: PropSetter<VpcElBase> }) {
        setters['itemdelimiter'] = [
            PrpTyp.Str,
            (me: VpcElProductOpts, s: string) => {
                checkThrowEq(1, s.length, `7C|length of itemDel must be 1`);
                me.set('itemDel', s);
            }
        ];

        setters['cursor'] = [
            PrpTyp.Str,
            (me: VpcElProductOpts, s: string) => {
                if (s === '1') {
                    s = 'beam';
                } else if (s === '2') {
                    s = 'cross';
                } else if (s === '3') {
                    s = 'plus';
                } else if (s === '4') {
                    s = 'watch';
                }

                let n = getStrToEnum<VpcCursors>(VpcCursors, `cursor ${s} not supported`, s);
                UI512CursorAccess.setCursor(n.valueOf());
            }
        ];

        setters['idlerate'] = [
            PrpTyp.Str,
            (me: VpcElProductOpts, s: string) => {
                if (s === 'faster') {
                    me.set('suggestedIdleRate', 'faster');
                } else if (!s || s === 'default') {
                    me.set('suggestedIdleRate', 'default');
                } else {
                    checkThrow(false, `Js|unsupported idlerate, try "faster" or "default"`);
                }
            }
        ];
    }

    /**
     * define getters and setters
     */
    static prodInit() {
        if (!VpcElProductOpts.cachedGetters || !VpcElProductOpts.cachedSetters) {
            VpcElProductOpts.cachedGetters = {};
            VpcElProductOpts.prodGetters(VpcElProductOpts.cachedGetters);
            VpcElProductOpts.cachedSetters = {};
            VpcElProductOpts.prodSetters(VpcElProductOpts.cachedSetters);
            Util512.freezeRecurse(VpcElProductOpts.cachedGetters);
            Util512.freezeRecurse(VpcElProductOpts.cachedSetters);
        }
    }

    /**
     * is this the name of a property?
     */
    static canGetProductProp(propName: string) {
        VpcElProductOpts.prodInit();
        return !!VpcElProductOpts.cachedGetters[propName] || !!VpcElProductOpts.cachedSetters[propName];
    }

    /**
     * is this the name of any property on any type of object?
     */
    static isAnyProp(propName: string) {
        VpcElButton.btnInit();
        VpcElField.fldInit();
        VpcElCard.cdInit();
        VpcElBg.bgInit();
        VpcElStack.stackInit();
        VpcElProductOpts.prodInit();
        return (
            !!VpcElButton.cachedGetters[propName] ||
            !!VpcElButton.cachedSetters[propName] ||
            !!VpcElField.cachedGetters[propName] ||
            !!VpcElField.cachedSetters[propName] ||
            !!VpcElCard.cachedGetters[propName] ||
            !!VpcElCard.cachedSetters[propName] ||
            !!VpcElBg.cachedGetters[propName] ||
            !!VpcElBg.cachedSetters[propName] ||
            !!VpcElStack.cachedGetters[propName] ||
            !!VpcElStack.cachedSetters[propName] ||
            !!VpcElProductOpts.cachedGetters[propName] ||
            !!VpcElProductOpts.cachedSetters[propName]
        );
    }

    /* provide script,
    1) we want to follow the product where 'send openCard to card 2'
    is not an error even if card 2 does not handle openCard. */
    static productOptsScript = `
on openbackground
end openbackground

on opencard
end opencard

on openstack
end openstack

on openfield
end openfield

on closebackground
end closebackground

on closecard
end closecard

on closefield
end closefield

on exitfield
end exitfield

on afterkeydown
end afterkeydown

on afterkeyup
end afterkeyup

on internalvpcbeginsetcurcardwithopencardevt
    global internalvpcbeginsetcurcardwithopencardevtparam
    go to card id internalvpcbeginsetcurcardwithopencardevtparam
end internalvpcbeginsetcurcardwithopencardevt
    `
}

/**
 * vipercard cursors
 */
export enum VpcCursors {
    __isUI512Enum = 1,
    __UI512EnumCapitalize = -1,
    Arrow = UI512Cursors.Arrow,
    Beam = UI512Cursors.Beam,
    Crosshair = UI512Cursors.Crosshair,
    Hand = UI512Cursors.Hand,
    Pencil = UI512Cursors.Pencil,
    Plus = UI512Cursors.Plus,
    Watch = UI512Cursors.Watch,
    Paintbrush = UI512Cursors.PaintBrush,
    Paintbucket = UI512Cursors.PaintBucket,
    Painttext = UI512Cursors.PaintText,
    Paintlasso = UI512Cursors.PaintLasso,
    Painteraser = UI512Cursors.PaintEraser,
    Paintspray = UI512Cursors.PaintSpray
}
