/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import type { Message, StickerSet, Update, NotifyPeer, PeerNotifySettings, PollResults, Poll, WebPage, GroupCall, GroupCallParticipant, ReactionCount, MessagePeerReaction, PhoneCall } from "../layer";
import type { AppMessagesManager, Dialog, MessagesStorageKey, MyMessage } from "./appManagers/appMessagesManager";
import type { MyDialogFilter } from "./storages/filters";
import type { Folder } from "./storages/dialogs";
import type { UserTyping } from "./appManagers/appProfileManager";
import type { MyDraftMessage } from "./appManagers/appDraftsManager";
import type { ConnectionStatusChange } from "./mtproto/connectionStatus";
import type { GroupCallId } from "./appManagers/appGroupCallsManager";
import type { AppManagers } from "./appManagers/managers";
import type { State } from "../config/state";
import type { Progress } from "./appManagers/appDownloadManager";
import type { CallId } from "./appManagers/appCallsManager";
import { NULL_PEER_ID, UserAuth } from "./mtproto/mtproto_config";
import EventListenerBase from "../helpers/eventListenerBase";
import { MOUNT_CLASS_TO } from "../config/debug";
import MTProtoMessagePort from "./mtproto/mtprotoMessagePort";
import { IS_WORKER } from "../helpers/context";

export type BroadcastEvents = {
  'chat_full_update': ChatId,
  'chat_update': ChatId,

  'channel_update': ChatId,
  
  'user_update': UserId,
  'user_auth': UserAuth,
  'user_full_update': UserId,

  'peer_pinned_messages': {peerId: PeerId, mids?: number[], pinned?: boolean, unpinAll?: true},
  'peer_pinned_hidden': {peerId: PeerId, maxId: number},
  'peer_typings': {peerId: PeerId, typings: UserTyping[]},
  'peer_block': {peerId: PeerId, blocked: boolean},
  'peer_title_edit': PeerId,
  'peer_bio_edit': PeerId,
  'peer_deleted': PeerId, // left chat, deleted user dialog, left channel
  'peer_full_update': PeerId,

  'filter_delete': MyDialogFilter,
  'filter_update': MyDialogFilter,
  'filter_new': MyDialogFilter,
  'filter_order': number[],

  'folder_unread': Omit<Folder, 'dialogs' | 'dispatchUnreadTimeout'>,
  
  'dialog_draft': {peerId: PeerId, dialog: Dialog, drop: boolean, draft: MyDraftMessage | undefined},
  'dialog_unread': {peerId: PeerId, dialog: Dialog},
  'dialog_flush': {peerId: PeerId, dialog: Dialog},
  'dialog_drop': {peerId: PeerId, dialog?: Dialog},
  'dialog_migrate': {migrateFrom: PeerId, migrateTo: PeerId},
  //'dialog_top': Dialog,
  'dialog_notify_settings': Dialog,
  // 'dialog_order': {dialog: Dialog, pos: number},
  'dialogs_multiupdate': {[peerId: PeerId]: Dialog},
  
  'history_append': {storageKey: MessagesStorageKey, message: Message.message},
  'history_update': {storageKey: MessagesStorageKey, message: MyMessage, sequential?: boolean},
  'history_reply_markup': {peerId: PeerId},
  'history_multiappend': MyMessage,
  'history_delete': {peerId: PeerId, msgs: Set<number>},
  'history_forbidden': PeerId,
  'history_reload': PeerId,
  //'history_request': void,
  
  'message_edit': {storageKey: MessagesStorageKey, peerId: PeerId, mid: number, message: MyMessage},
  'message_sent': {storageKey: MessagesStorageKey, tempId: number, tempMessage: any, mid: number, message: MyMessage},
  'messages_views': {peerId: PeerId, mid: number, views: number}[],
  'messages_reactions': {message: Message.message, changedResults: ReactionCount[]}[],
  'messages_pending': void,
  'messages_read': void,
  'messages_downloaded': {peerId: PeerId, mids: number[]},
  'messages_media_read': {peerId: PeerId, mids: number[]},

  'replies_updated': Message.message,

  'scheduled_new': Message.message,
  'scheduled_delete': {peerId: PeerId, mids: number[]},

  'album_edit': {peerId: PeerId, groupId: string, deletedMids: number[], messages: Message.message[]},

  'stickers_installed': StickerSet.stickerSet,
  'stickers_deleted': StickerSet.stickerSet,

  'state_cleared': void,
  'state_synchronized': ChatId | void,
  'state_synchronizing': ChatId | void,
  
  'contacts_update': UserId,
  'avatar_update': PeerId,
  'poll_update': {poll: Poll, results: PollResults},
  'invalidate_participants': ChatId,
  //'channel_settings': {channelId: number},
  'webpage_updated': {id: WebPage.webPage['id'], msgs: {peerId: PeerId, mid: number, isScheduled: boolean}[]},

  'connection_status_change': ConnectionStatusChange,
  'settings_updated': {key: string, value: any, settings: State['settings']},
  'draft_updated': {peerId: PeerId, threadId: number, draft: MyDraftMessage | undefined, force?: boolean},
  
  'background_change': void,
  
  'privacy_update': Update.updatePrivacy,
  
  'notify_settings': Update.updateNotifySettings,
  'notify_peer_type_settings': {key: Exclude<NotifyPeer['_'], 'notifyPeer'>, settings: PeerNotifySettings},

  'notification_reset': string,
  'notification_cancel': string,
  
  'language_change': string,
  
  'theme_change': void,

  'media_play': void,
  
  'emoji_recent': string,
  
  'download_progress': Progress,
  'document_downloading': DocId,
  'document_downloaded': DocId,

  'choosing_sticker': boolean

  'group_call_update': GroupCall,
  'group_call_participant': {groupCallId: GroupCallId, participant: GroupCallParticipant},
  // 'group_call_video_track_added': {instance: GroupCallInstance}

  'call_update': PhoneCall,
  'call_signaling': {callId: CallId, data: Uint8Array},

  'quick_reaction': string,

  'service_notification': Update.updateServiceNotification,

  'logging_out': void
};

export type BroadcastEventsListeners = {
  [name in keyof BroadcastEvents]: (e: BroadcastEvents[name]) => void
};

export class RootScope extends EventListenerBase<BroadcastEventsListeners> {
  public myId: PeerId = NULL_PEER_ID;
  private connectionStatus: {[name: string]: ConnectionStatusChange} = {};
  public settings: State['settings'];
  public managers: AppManagers;
  public premium: boolean;

  constructor() {
    super();

    this.premium = false;

    this.addEventListener('user_auth', ({id}) => {
      this.myId = id.toPeerId();
    });

    this.addEventListener('connection_status_change', (status) => {
      this.connectionStatus[status.name] = status;
    });

    this.dispatchEvent = (e, ...args) => {
      super.dispatchEvent(e, ...args);
      MTProtoMessagePort.getInstance().invokeVoid('event', {name: e as string, args});
    };

    if(!IS_WORKER) {
      this.addEventListener('settings_updated', ({settings}) => {
        this.settings = settings;
      });
    }
  }

  public getConnectionStatus() {
    return this.connectionStatus;
  }
  
  public dispatchEventSingle(...args: any[]) {
    // @ts-ignore
    super.dispatchEvent(...args);
  }
}

const rootScope = new RootScope();
MOUNT_CLASS_TO.rootScope = rootScope;
export default rootScope;
