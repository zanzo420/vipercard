
/* auto */ import { O, assertTrueWarn, checkThrowUI512 } from '../../ui512/utils/utilsAssert.js';
/* auto */ import { RenderComplete, assertEq, base10, cast, getRoot, slength } from '../../ui512/utils/utilsUI512.js';
/* auto */ import { MenuConsts } from '../../ui512/utils/utilsDrawConstants.js';
/* auto */ import { lng } from '../../ui512/lang/langBase.js';
/* auto */ import { UI512DrawText } from '../../ui512/draw/ui512DrawText.js';
/* auto */ import { UI512ElGroup } from '../../ui512/elements/ui512ElementsGroup.js';
/* auto */ import { UI512Application } from '../../ui512/elements/ui512ElementsApp.js';
/* auto */ import { UI512BtnStyle, UI512ElButton } from '../../ui512/elements/ui512ElementsButton.js';
/* auto */ import { UI512MenuDropdown, UI512MenuItem, UI512MenuRoot } from '../../ui512/elements/ui512ElementsMenu.js';
/* auto */ import { UI512PresenterWithMenuInterface } from '../../ui512/menu/ui512PresenterWithMenu.js';

/**
 * you can build a menu in code,
 * but for convenience we have a way to build meny from an array
 * see example in uiDemoMenus
 */
export type UI512MenuDefn = [string, string[]] | [string, number, string[]];

/**
 * sets the position of the models
 * and creates a few helper elements
 */
export class MenuPositioning {
    /**
     * create menu helper elements. must be called when adding a menubar.
     */
    static createMenuHelperEls(app: UI512Application, grpItems: UI512ElGroup, menuRoot: UI512MenuRoot) {
        let dropdownBgId = menuRoot.id + '##dropdownBg';
        if (!grpItems.findEl(dropdownBgId)) {
            let dropdownBg = new UI512ElButton(dropdownBgId, menuRoot.observer);
            dropdownBg.set('autohighlight', false);
            dropdownBg.set('style', UI512BtnStyle.Shadow);
            grpItems.addElement(app, dropdownBg);
        }
    }

    /**
     * remove helper elements. call when removing a menubar.
     */
    static removeMenuHelperObjects(app: UI512Application, grpItems: UI512ElGroup, menuRoot: UI512MenuRoot) {
        let dropdownBgId = menuRoot.id + '##dropdownBg';
        grpItems.removeElement(dropdownBgId);
    }

    /**
     * remove a menu
     */
    static removeMenuRoot(app: UI512Application, grp: UI512ElGroup, menuRoot: UI512MenuRoot) {
        let [grpBar, grpItems] = MenuPositioning.getMenuGroups(app, false);
        assertEq(grp.id, grpBar.id, '2]|');
        MenuPositioning.removeMenuHelperObjects(app, grpItems, menuRoot);
        let children = menuRoot.getchildren(app);
        for (let child of children) {
            for (let subchild of child.getChildren(app)) {
                grpItems.removeElement(subchild.id);
            }

            grpBar.removeElement(child.id);
        }

        grpBar.removeElement(menuRoot.id);
    }

    /**
     * set positions of menu items.
     */
    static setMenuItemPositions(
        app: UI512Application,
        menuRoot: UI512MenuRoot,
        header: UI512MenuDropdown,
        complete: RenderComplete
    ) {
        /* highlight the menu name */
        header.set('highlightactive', true);

        /* find the widest string, and set the width based on that */
        let items = header.getChildren(app);
        let widest = MenuPositioning.getWidestString(items);
        if (widest === undefined) {
            /* font has not loaded yet */
            complete.complete = false;
            return;
        }

        let totalHeight = MenuConsts.ItemHeight * items.length;
        let rect = [header.x, header.bottom, widest, totalHeight];
        let isRightSide = header.get_n('fixedoffset') !== -1;
        if (isRightSide) {
            /* drawing a menu on the right side, it is right-justified */
            const farRight = app.bounds[0] + app.bounds[2];
            let shiftAmount = rect[0] + rect[2] - farRight;
            if (shiftAmount > 0) {
                rect[0] -= shiftAmount;
            }
        }

        /* draw shadowed bg */
        /* the top of this rect will goes under the main menu bar, so the top line won't be seen */
        let [grpBar, grpItems] = MenuPositioning.getMenuGroups(app);
        let dropdownBg = grpItems.getEl(menuRoot.id + '##dropdownBg');
        dropdownBg.setDimensions(
            rect[0],
            rect[1] - 1,
            rect[2],
            rect[3] + 1 + MenuConsts.ShadowSizeBottom /* for the shadow*/
        );

        /* draw items */
        for (let i = 0; i < items.length; i++) {
            items[i].setDimensions(
                rect[0] + MenuConsts.ShadowSizeLeft,
                rect[1] + MenuConsts.ItemHeight * i,
                rect[2] - (MenuConsts.ShadowSizeLeft + MenuConsts.ShadowSizeRight),
                MenuConsts.ItemHeight
            );

            items[i].set('visible', true);
        }
    }

    /**
     * set positions of a menu dropdown.
     */
    static setMenuDropdownPosition(
        app: UI512Application,
        menuRoot: UI512MenuRoot,
        header: UI512MenuDropdown,
        curX: number,
        isExpanded: boolean,
        complete: RenderComplete
    ) {
        /* measure width of the header to draw */
        let drawText = getRoot().getDrawText() as UI512DrawText;
        let curwidth = header.get_n('fixedwidth');
        if (curwidth === -1) {
            let measured = drawText.measureString(header.get_s('labeltext'));
            if (!measured) {
                complete.complete = false;
                return curX;
            }

            curwidth = measured.newLogicalX + MenuConsts.XSpacing;
        }

        /* x position is overridden, e.g. menus on the right. */
        if (header.get_n('fixedoffset') !== -1) {
            curX = header.get_n('fixedoffset');
        }

        /* the emulator has a 1 pixel margin between top of screen and menu, */
        /* but we'll not do that because it doesn't look good against black background */
        header.setDimensions(curX - 4, app.bounds[1], curwidth + 5, MenuConsts.BarHeight - 1);
        curX += curwidth;

        /* draw active one */
        header.set('highlightactive', false);
        if (isExpanded) {
            MenuPositioning.setMenuItemPositions(app, menuRoot, header, complete);

            let [grpBar, grpItems] = MenuPositioning.getMenuGroups(app);
            grpItems.setVisible(true);
        } else {
            for (let item of header.getChildren(app)) {
                item.set('visible', false);
            }
        }

        return curX;
    }

    /**
     * set all menu positions
     */
    static setMenuPositions(app: UI512Application, menuRoot: UI512MenuRoot, complete: RenderComplete) {
        if (!menuRoot || !menuRoot.visible || !menuRoot.get_s('childids')) {
            return;
        }

        /* top bar */
        let [grpBar, grpItems] = MenuPositioning.getMenuGroups(app);
        menuRoot.setDimensions(app.bounds[0], app.bounds[1], app.bounds[2], MenuConsts.BarHeight - 1);
        assertTrueWarn(grpItems.findEl(menuRoot.id + '##dropdownBg'), 'forgot to call createMenuHelperEls?');

        /* draw menu headers */
        /* interesting fact: the headers overlap each other. confirmed in emulator */
        let curX = app.bounds[0] + MenuConsts.TopHeaderMargin1;
        let counticonsdrawn = 0;
        let dropdns = menuRoot.getchildren(app);
        grpItems.setVisible(false);
        for (let i = 0; i < dropdns.length; i++) {
            let header = dropdns[i];
            let open = menuRoot.get_n('whichIsExpanded') === i;
            curX = MenuPositioning.setMenuDropdownPosition(app, menuRoot, header, curX, open, complete);
        }
    }

    /**
     * measure the widest label
     */
    protected static getWidestString(items: UI512MenuItem[]): O<number> {
        let drawText = getRoot().getDrawText() as UI512DrawText;
        let widest = 0;
        for (let item of items) {
            let width = drawText.measureString(item.get_s('labeltext'));
            if (!width) {
                return undefined;
            }

            widest = Math.max(widest, width.newLogicalX + MenuConsts.AddToWidth);
        }

        return widest;
    }

    /**
     * uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu
     */
    private static buildDropdnFromArray(
        app: UI512Application,
        grpBar: UI512ElGroup,
        grpItems: UI512ElGroup,
        menuRoot: UI512MenuRoot,
        dropdowns: string[],
        childids: string[],
        ar: any
    ) {
        let armenuheader = undefined;
        let armenu = undefined;
        let fixedoffset = -1;
        if (ar.length === 2) {
            [armenuheader, armenu] = ar;
        } else {
            [armenuheader, fixedoffset, armenu] = ar;
        }

        let [headerid, headerlabeluntranslated] = armenuheader.split('|');
        let dropdn = new UI512MenuDropdown(headerid);
        dropdowns.push(headerid);
        grpBar.addElementAfter(app, dropdn, menuRoot.id);
        dropdn.set('fixedoffset', fixedoffset);
        if (headerlabeluntranslated.startsWith('icon:')) {
            let [_, icongroupid, iconnumber, fixwidth] = headerlabeluntranslated.split(':');
            dropdn.set('icongroupid', icongroupid);
            dropdn.set('iconnumber', parseInt(iconnumber, base10));
            dropdn.set('fixedwidth', parseInt(fixwidth, base10));
            dropdn.set('labeltext', '');
        } else {
            dropdn.set('labeltext', lng(headerlabeluntranslated));
        }

        assertTrueWarn(grpItems.findEl(menuRoot.id + '##dropdownBg'), 'forgot to call createMenuHelperEls?');
        for (let menustring of armenu) {
            let [itemid, itemuntranslated, hotkey] = menustring.split('|');
            itemid = slength(itemid) ? itemid : 'unnamedmenu' + Math.random();
            let item = new UI512MenuItem(itemid);

            grpItems.addElement(app, item);
            childids.push(itemid);
            item.set('labeltext', itemuntranslated === '---' ? itemuntranslated : lng(itemuntranslated));
            item.set('labelhotkey', hotkey.replace(/ /g, ''));
            item.set('visible', false);
        }

        return dropdn;
    }

    /**
     * you can build a menu in code,
     * but for convenience we have a way to build meny from an array
     * see example in uiDemoMenus
     */
    static buildFromArray(pr: UI512PresenterWithMenuInterface, st: UI512MenuDefn[]) {
        let menuRoot = MenuPositioning.getMenuRoot(pr.app);
        let [grpBar, grpItems] = MenuPositioning.getMenuGroups(pr.app);

        /* ensures background items are created first, because they should be behind foreground */
        MenuPositioning.createMenuHelperEls(pr.app, grpItems, menuRoot);

        let dropdowns: string[] = [];
        for (let ar of st) {
            let childids: string[] = [];
            let dropdn = MenuPositioning.buildDropdnFromArray(
                pr.app,
                grpBar,
                grpItems,
                menuRoot,
                dropdowns,
                childids,
                ar
            );

            dropdn.set('childids', childids.join('|'));
        }

        menuRoot.set('childids', dropdowns.join('|'));
    }

    /**
     * get groups for menus
     */
    static getMenuGroups(app: UI512Application, createIfNeeded = true): [UI512ElGroup, UI512ElGroup] {
        return [
            MenuPositioning.getOrCreateGrp(app, '$$grpmenubar', createIfNeeded),
            MenuPositioning.getOrCreateGrp(app, '$$grpmenuitems', createIfNeeded)
        ];
    }

    /**
     * get or create a group
     */
    static getOrCreateGrp(app: UI512Application, s: string, createIfNeeded: boolean) {
        let grp = app.findGroup(s);
        if (grp) {
            return grp;
        } else {
            checkThrowUI512(createIfNeeded, '2[|menubar group expected but not found');
            let addedGrp = new UI512ElGroup(s, app.observer);
            app.addGroup(addedGrp);
            return addedGrp;
        }
    }

    /**
     * by default we'll give the menuRoot a hard-coded id so it can always be found by id
     */
    static getMenuRoot(app: UI512Application, createIfNeeded = true): UI512MenuRoot {
        let [grpBar, grpItems] = MenuPositioning.getMenuGroups(app, createIfNeeded);
        let elem = grpBar.findEl('$$menubarforapp');
        if (elem) {
            return cast(elem, UI512MenuRoot);
        } else {
            checkThrowUI512(createIfNeeded, '2[|menubar group expected but not found');
            let mb = new UI512MenuRoot('$$menubarforapp', app.observer);
            grpBar.addElement(app, mb);
            return mb;
        }
    }

    /**
     * dynamically change a property on the menu item.
     */
    static setItemStatus(
        app: UI512Application,
        id: string,
        checked: O<boolean>,
        enabled: O<boolean>,
        translatedLabel?: string
    ) {
        let [grpBar, grpItems] = MenuPositioning.getMenuGroups(app, true);
        let elem = grpItems.findEl(id);
        if (elem) {
            if (checked !== undefined) {
                elem.set('checkmark', checked);
            }

            if (enabled !== undefined) {
                elem.set('enabled', enabled);
                elem.set('enabledstyle', enabled);
            }

            if (translatedLabel !== undefined) {
                elem.set('labeltext', translatedLabel);
            }
        } else {
            assertTrueWarn(false, `2?|menuitem ${id} not found`);
        }
    }
}
