import AvatarElement from '../../components/avatar';
import { ButtonMenuItemOptions } from '../../components/buttonMenu';
import Chat from '../../components/chat/chat';
import { request } from './request';

import Emittery from 'emittery';
import { Dialog } from '../appManagers/appMessagesManager';

class CRMDialogs {
    private dialogTypes: Array<any> = [];
    private dialogGroups: Array<any> = [];

    dialogs: Array<any> = [];
    emitter = new Emittery();

    selectedGroupFilter: string = "Все";

    selectedTypeFilter: string = "Все";

    canLoadDefaultDialogs: boolean = true;


    constructor() {

    }

    public init() {
        console.log("CRMDialogs")
        this.getGroups()
        this.getTypes()
        this.getDialogs()
    }

    public async getGroups() {
        console.log("Get dialog groups")

        var res = await request.get('/dialogs/groups')
        this.dialogGroups = [];
        var body = res.data;
        body.forEach((e: any) => {
            this.dialogGroups.push(e)
        });
        this.selectFilterGroup('Все');
    }

    public async getTypes() {
        console.log("Get dialog types")

        var res = await request.get('/dialogs/types')
        this.dialogTypes = [];
        var body = res.data;
        body.forEach((e: any) => {
            this.dialogTypes.push(e)
        });
        this.selectFilter('Все');
    }

    public async getDialogs() {
        this.dialogs = [];
        var res = await request.get('/dialogs/get')
        var body = res.data;
        body.forEach((e: any) => {
            this.dialogs.push(e)
        });

        console.log("Dialogs length", this.dialogs.length)

        this.emitter.emit('updated');
    }

    public getDialogTypesButtons(chat: Chat) {
        const userId = chat.peerId.toUserId().toString();
        const dialog = this.dialogs.find((e: any) => e.userId == userId);
        console.log(userId, dialog)

        var dialogTypesButtons: (ButtonMenuItemOptions & { verify: () => boolean })[] = [];
        this.dialogTypes.forEach((e) => {
            var selected = dialog != null ? (dialog.type == e.type ? 'danger' : '') : '';
            dialogTypesButtons.push({
                icon: 'select ' + selected,
                regularText: e['type'],
                onClick: () => {
                    this.markDialogType(userId, e['type']).then(() => {
                        this.getDialogs();
                    })
                },
                verify: () => true,
            })
        })

        return dialogTypesButtons;
    }

    public getDialogGroupsButtons(chat: Chat) {
        const userId = chat.peerId.toUserId().toString();
        const dialog = this.dialogs.find((e: any) => e.userId == userId);
        console.log(userId, dialog)

        var dialogGroupsButtons: (ButtonMenuItemOptions & { verify: () => boolean })[] = [];
        this.dialogGroups.forEach((e) => {
            var selected = dialog != null ? (dialog.group == e.group ? 'danger' : '') : '';
            console.log("selected")
            console.log(selected)
            dialogGroupsButtons.push({
                icon: 'select ' + selected,
                regularText: e['group'],
                onClick: () => {
                    this.markDialogGroup(userId, e['group']).then(() => {
                        this.getDialogs();
                    })
                },
                verify: () => true,
            })
        })

        return dialogGroupsButtons;
    }

    public async markDialogType(userId: string, type: string) {
        await request.post('/dialogs/mark', {
            userId: userId,
            type: type
        })
        return;
    }
    public async markDialogGroup(userId: string, group: string) {
        await request.post('/dialogs/mark', {
            userId: userId,
            group: group
        })
        return;
    }

    public dialogChanged() {
        this.emitter.emit('updated');
    }

    public getDialogBadges(userId: string): Array<HTMLElement> {
        const dialog = this.dialogs.find((e: any) => e.userId == userId);
        if (!dialog) return [];

        var badges: Array<HTMLElement> = [];

        //type
        const badgeType = document.createElement('div');
        badgeType.className = 'dialog-subtitle-badge badge badge-24 is-visible unread';

        if (dialog.type !== undefined && dialog.type.length > 0) {
            badgeType.innerText = dialog['type'];
            badges.push(badgeType);
        }

        //group
        const badgeGroup = document.createElement('div');
        badgeGroup.className = 'dialog-subtitle-badge badge badge-24 is-visible unread';

        if (dialog.group !== undefined && dialog.group.length > 0) {
            badgeGroup.innerText = dialog['group'];
            badges.push(badgeGroup);
        }

        return badges;
    }

    public getDialog(userId: string): any {
        const dialog = this.dialogs.find((e: any) => e.userId == userId);
        if (!dialog) return null;
        return dialog;
    }


    public selectFilterGroup(type: string) {
        this.selectedGroupFilter = type;
        this.emitter.emit('selected_group');

        if (this.selectedGroupFilter == 'Все' || this.selectedGroupFilter == 'Без тега') {
            this.canLoadDefaultDialogs = true;
            this.emitter.emit('load_dialogs');
        }
        else {
            this.canLoadDefaultDialogs = false;
            this.emitter.emit('load_crm_dialogs');
        }
    }


    public selectFilter(type: string) {
        this.selectedTypeFilter = type;
        this.emitter.emit('selected_type');

        if (this.selectedTypeFilter == 'Все' || this.selectedTypeFilter == 'Без тега') {
            this.canLoadDefaultDialogs = true;
            this.emitter.emit('load_dialogs');
        }
        else {
            this.canLoadDefaultDialogs = false;
            this.emitter.emit('load_crm_dialogs');
        }
    }


    public getFilterGroupButton() {
        var dialogGroupsButtons: (ButtonMenuItemOptions & { verify: () => boolean })[] = [];
        dialogGroupsButtons.push({
            icon: 'select' + (this.selectedGroupFilter == 'Все' ? ' danger' : ''),
            regularText: 'Все',
            onClick: () => {
                this.selectFilterGroup('Все');
            },
            verify: () => true,
        })

        dialogGroupsButtons.push({
            icon: 'select' + (this.selectedGroupFilter == 'Без тега' ? ' danger' : ''),
            regularText: 'Без тега',
            onClick: () => {
                this.selectFilterGroup('Без тега');
            },
            verify: () => true,
        })

        dialogGroupsButtons.push({
            icon: '',
            regularText: '',
            onClick: () => {
            },
            verify: () => true,
        })


        this.dialogGroups.forEach((e) => {
            dialogGroupsButtons.push({
                icon: 'select' + (this.selectedGroupFilter == e['group'] ? ' danger' : ''),
                regularText: e['group'],
                onClick: () => {
                    this.selectFilterGroup(e['group']);
                },
                verify: () => true,
            })
        })

        return dialogGroupsButtons;
    }


    public getFilterTypeButton() {
        var dialogTypesButtons: (ButtonMenuItemOptions & { verify: () => boolean })[] = [];
        dialogTypesButtons.push({
            icon: 'select' + (this.selectedTypeFilter == 'Все' ? ' danger' : ''),
            regularText: 'Все',
            onClick: () => {
                this.selectFilter('Все');
            },
            verify: () => true,
        })

        dialogTypesButtons.push({
            icon: 'select' + (this.selectedTypeFilter == 'Без тега' ? ' danger' : ''),
            regularText: 'Без тега',
            onClick: () => {
                this.selectFilter('Без тега');
            },
            verify: () => true,
        })

        dialogTypesButtons.push({
            icon: '',
            regularText: '',
            onClick: () => {
            },
            verify: () => true,
        })


        this.dialogTypes.forEach((e) => {
            dialogTypesButtons.push({
                icon: 'select' + (this.selectedTypeFilter == e['type'] ? ' danger' : ''),
                regularText: e['type'],
                onClick: () => {
                    this.selectFilter(e['type']);
                },
                verify: () => true,
            })
        })

        return dialogTypesButtons;
    }

    public getCRMDialogsToLoad() {
        return this.dialogs.filter((e: any) => e['type'] == this.selectedTypeFilter || e['group'] == this.selectedGroupFilter);
    }

    public canAddDialog(dialog: Dialog) {
        const d = this.getDialog(dialog.peerId.toUserId().toString())
        if (this.selectedTypeFilter == "Все")
            return true;
        if (this.selectedTypeFilter == "Без тега" && d == null)
            return true;

        return false;
    }

    public canAddDialogGroup(dialog: Dialog) {
        const d = this.getDialog(dialog.peerId.toUserId().toString())
        if (this.selectedGroupFilter == "Все")
            return true;
        if (this.selectedGroupFilter == "Без тега" && d == null)
            return true;

        return false;
    }
}

const crmDialogs = new CRMDialogs();
export default crmDialogs

