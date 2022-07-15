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

    selectedTypeFilter: string = "Все";

    canLoadDefaultDialogs: boolean = true;


    constructor() {

    }

    public init() {
        console.log("CRMDialogs")
        this.getTypes()
        this.getDialogs();

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

    public async markDialogType(userId: string, type: string) {
        await request.post('/dialogs/mark', {
            userId: userId,
            type: type
        })
        return;
    }
    public async markDialogGroup(userId: string, group: string) {
        await request.post('/dialog/mark', {
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

        const badgeType = document.createElement('div');
        badgeType.className = 'dialog-subtitle-badge badge badge-24 is-visible unread';
        badgeType.innerText = dialog['type'];

        return [badgeType];
    }

    public getDialog(userId: string): any {
        const dialog = this.dialogs.find((e: any) => e.userId == userId);
        if (!dialog) return null;
        return dialog;
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
        return this.dialogs.filter((e: any) => e['type'] == this.selectedTypeFilter && e['userId'] != 0);
    }

    public canAddDialog(dialog: Dialog) {
        const d = this.getDialog(dialog.peerId.toUserId().toString())
        if (this.selectedTypeFilter == "Все")
            return true;
        if (this.selectedTypeFilter == "Без тега" && d == null)
            return true;

        return false;
    }
}

const crmDialogs = new CRMDialogs();
export default crmDialogs

