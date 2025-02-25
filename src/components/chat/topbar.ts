/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import type { Channel } from "../../lib/appManagers/appChatsManager";
import type { AppSidebarRight } from "../sidebarRight";
import type Chat from "./chat";
import { RIGHT_COLUMN_ACTIVE_CLASSNAME } from "../sidebarRight";
import mediaSizes, { ScreenSize } from "../../helpers/mediaSizes";
import { IS_SAFARI } from "../../environment/userAgent";
import rootScope from "../../lib/rootScope";
import AvatarElement from "../avatar";
import Button from "../button";
import ButtonIcon from "../buttonIcon";
import ButtonMenuToggle from "../buttonMenuToggle";
import ChatAudio from "./audio";
import ChatPinnedMessage from "./pinnedMessage";
import { ButtonMenuItemOptions } from "../buttonMenu";
import ListenerSetter from "../../helpers/listenerSetter";
import PopupDeleteDialog from "../popups/deleteDialog";
import appNavigationController from "../appNavigationController";
import { LEFT_COLUMN_ACTIVE_CLASSNAME } from "../sidebarLeft";
import PeerTitle from "../peerTitle";
import { i18n } from "../../lib/langPack";
import findUpClassName from "../../helpers/dom/findUpClassName";
import blurActiveElement from "../../helpers/dom/blurActiveElement";
import cancelEvent from "../../helpers/dom/cancelEvent";
import { attachClickEvent } from "../../helpers/dom/clickEvent";
import findUpTag from "../../helpers/dom/findUpTag";
import { toast, toastNew } from "../toast";
import replaceContent from "../../helpers/dom/replaceContent";
import { ChatFull, Chat as MTChat, GroupCall } from "../../layer";
import PopupPickUser from "../popups/pickUser";
import PopupPeer from "../popups/peer";
import { fastRaf } from "../../helpers/schedulers";
import AppEditContactTab from "../sidebarRight/tabs/editContact";
import appMediaPlaybackController from "../appMediaPlaybackController";
import IS_GROUP_CALL_SUPPORTED from "../../environment/groupCallSupport";
import IS_CALL_SUPPORTED from "../../environment/callSupport";
import { CallType } from "../../lib/calls/types";
import PopupMute from "../popups/mute";
import generateTitleIcons from "../generateTitleIcons";
import { AppManagers } from "../../lib/appManagers/managers";
import hasRights from "../../lib/appManagers/utils/chats/hasRights";
import wrapPeerTitle from "../wrappers/peerTitle";
import groupCallsController from "../../lib/calls/groupCallsController";
import apiManagerProxy from "../../lib/mtproto/mtprotoworker";

import CRMDialog from "../../lib/crmLibs/dialogs"
import crmOperator from "../../lib/crmLibs/operators";


type ButtonToVerify = { element?: HTMLElement, verify: () => boolean | Promise<boolean> };

export default class ChatTopbar {
  public container: HTMLDivElement;
  private btnBack: HTMLButtonElement;
  private chatInfo: HTMLDivElement;
  private avatarElement: AvatarElement;
  private title: HTMLDivElement;
  private subtitle: HTMLDivElement;
  private chatUtils: HTMLDivElement;
  private btnJoin: HTMLButtonElement;
  private btnPinned: HTMLButtonElement;
  private btnCall: HTMLButtonElement;
  private btnGroupCall: HTMLButtonElement;
  private btnMute: HTMLButtonElement;
  private btnSearch: HTMLButtonElement;
  private btnMore: HTMLElement;

  //CRM
  private btnDialogType: HTMLElement;
  private dialogTypes: (ButtonMenuItemOptions & { verify: () => boolean })[];

  private btnDialogGroup: HTMLElement;
  private dialogGroups: (ButtonMenuItemOptions & { verify: () => boolean })[];


  private chatAudio: ChatAudio;
  public pinnedMessage: ChatPinnedMessage;

  private setUtilsRAF: number;
  private setPeerStatusInterval: number;

  public listenerSetter: ListenerSetter;

  private menuButtons: (ButtonMenuItemOptions & { verify: ButtonToVerify['verify'] })[];
  private buttonsToVerify: ButtonToVerify[];
  private chatInfoContainer: HTMLDivElement;

  constructor(
    private chat: Chat,
    private appSidebarRight: AppSidebarRight,
    private managers: AppManagers
  ) {
    this.listenerSetter = new ListenerSetter();

    this.menuButtons = [];
    this.buttonsToVerify = [];
  }

  public construct() {

    //CRM
    CRMDialog.emitter.on('updated', (data: any) => {
      this.chatUtils.removeChild(this.btnDialogType);
      this.dialogTypes = CRMDialog.getDialogTypesButtons(this.chat);
      this.btnDialogType = ButtonMenuToggle({ listenerSetter: this.listenerSetter }, 'bottom-left', this.dialogTypes, this.verifyButtons);

      this.btnDialogType.classList.remove('tgico-more');
      this.btnDialogType.classList.add('tgico-settings');

      this.chatUtils.appendChild(this.btnDialogType);


      this.chatUtils.removeChild(this.btnDialogGroup);
      this.dialogGroups = CRMDialog.getDialogGroupsButtons(this.chat);
      this.btnDialogGroup = ButtonMenuToggle({ listenerSetter: this.listenerSetter }, 'bottom-left', this.dialogGroups, this.verifyButtons);

      this.btnDialogGroup.classList.remove('tgico-more');
      this.btnDialogGroup.classList.add('tgico-settings');

      this.chatUtils.appendChild(this.btnDialogGroup);
    })

    //this.chat.log.error('Topbar construction');

    this.container = document.createElement('div');
    this.container.classList.add('sidebar-header', 'topbar', 'hide');
    this.container.dataset.floating = '0';

    this.btnBack = ButtonIcon('left sidebar-close-button', { noRipple: true });

    // * chat info section
    this.chatInfoContainer = document.createElement('div');
    this.chatInfoContainer.classList.add('chat-info-container');

    this.chatInfo = document.createElement('div');
    this.chatInfo.classList.add('chat-info');

    const person = document.createElement('div');
    person.classList.add('person');

    const content = document.createElement('div');
    content.classList.add('content');

    const top = document.createElement('div');
    top.classList.add('top');

    this.title = document.createElement('div');
    this.title.classList.add('user-title');

    top.append(this.title);

    const bottom = document.createElement('div');
    bottom.classList.add('bottom');

    if (this.subtitle) {
      bottom.append(this.subtitle);
    }

    content.append(top, bottom);
    if (this.avatarElement) {
      person.append(this.avatarElement);
    }

    person.append(content);
    this.chatInfo.append(person);

    // * chat utils section
    this.chatUtils = document.createElement('div');
    this.chatUtils.classList.add('chat-utils');

    this.chatAudio = new ChatAudio(this, this.chat, this.managers);

    if (this.menuButtons.length) {
      this.btnMore = ButtonMenuToggle({ listenerSetter: this.listenerSetter }, 'bottom-left', this.menuButtons, this.verifyButtons);
    }

    //CRM
    this.dialogGroups = CRMDialog.getDialogGroupsButtons(this.chat);
    this.btnDialogGroup = ButtonMenuToggle({ listenerSetter: this.listenerSetter }, 'bottom-left', this.dialogGroups, this.verifyButtons);
    this.btnDialogGroup.classList.remove('tgico-more');
    this.btnDialogGroup.classList.add('tgico-settings');

    this.dialogTypes = CRMDialog.getDialogTypesButtons(this.chat);
    this.btnDialogType = ButtonMenuToggle({ listenerSetter: this.listenerSetter }, 'bottom-left', this.dialogTypes, this.verifyButtons);
    this.btnDialogType.classList.remove('tgico-more');
    this.btnDialogType.classList.add('tgico-settings');

    this.chatUtils.append(...[
      // this.chatAudio ? this.chatAudio.divAndCaption.container : null, 
      this.pinnedMessage ? this.pinnedMessage.pinnedMessageContainer.divAndCaption.container : null,
      this.btnJoin,
      this.btnPinned,
      this.btnCall,
      this.btnGroupCall,
      this.btnMute,
      this.btnSearch,
      this.btnMore,
      this.btnDialogGroup,
      this.btnDialogType
    ].filter(Boolean));

    this.pushButtonToVerify(this.btnCall, this.verifyCallButton.bind(this, 'voice'));
    this.pushButtonToVerify(this.btnGroupCall, this.verifyVideoChatButton);

    this.chatInfoContainer.append(this.btnBack, this.chatInfo, this.chatUtils);
    this.container.append(this.chatInfoContainer);

    if (this.chatAudio) {
      // this.container.append(this.chatAudio.divAndCaption.container, this.chatUtils);
      this.container.append(this.chatAudio.divAndCaption.container);
    }

    // * construction end

    // * fix topbar overflow section

    this.listenerSetter.add(window)('resize', this.onResize);
    this.listenerSetter.add(mediaSizes)('changeScreen', this.onChangeScreen);

    attachClickEvent(this.container, (e) => {
      const container = findUpClassName(e.target, 'pinned-container');
      blurActiveElement();
      if (container) {
        cancelEvent(e);

        if (findUpClassName(e.target, 'progress-line')) {
          return;
        }

        const mid = +container.dataset.mid;
        if (container.classList.contains('pinned-message')) {
          //if(!this.pinnedMessage.locked) {
          this.pinnedMessage.followPinnedMessage(mid);
          //}
        } else {
          const peerId = container.dataset.peerId.toPeerId();
          const searchContext = appMediaPlaybackController.getSearchContext();
          this.chat.appImManager.setInnerPeer({
            peerId,
            lastMsgId: mid,
            type: searchContext.isScheduled ? 'scheduled' : (searchContext.threadId ? 'discussion' : undefined),
            threadId: searchContext.threadId
          });
        }
      } else {
        if (mediaSizes.activeScreen === ScreenSize.medium && document.body.classList.contains(LEFT_COLUMN_ACTIVE_CLASSNAME)) {
          onBtnBackClick();
        } else if (findUpTag(e.target, 'AVATAR-ELEMENT')) {
          this.appSidebarRight.toggleSidebar(!document.body.classList.contains(RIGHT_COLUMN_ACTIVE_CLASSNAME));
        } else {
          this.appSidebarRight.toggleSidebar(true);
        }
      }
    }, { listenerSetter: this.listenerSetter });

    const onBtnBackClick = (e?: Event) => {
      if (e) {
        cancelEvent(e);
      }

      //const item = appNavigationController.findItemByType('chat');
      // * return manually to chat by arrow, since can't get back to
      if (mediaSizes.activeScreen === ScreenSize.medium && document.body.classList.contains(LEFT_COLUMN_ACTIVE_CLASSNAME)) {
        this.chat.appImManager.setPeer({ peerId: this.peerId });
      } else {
        const isFirstChat = this.chat.appImManager.chats.indexOf(this.chat) === 0;
        appNavigationController.back(isFirstChat ? 'im' : 'chat');
        /* return;

        if(mediaSizes.activeScreen === ScreenSize.medium && !appNavigationController.findItemByType('chat')) {
          this.chat.appImManager.setPeer(0);
          blurActiveElement();
        } else {
          appNavigationController.back('chat');
        } */
      }
    };

    attachClickEvent(this.btnBack, onBtnBackClick, { listenerSetter: this.listenerSetter });
  }

  private pushButtonToVerify(element: HTMLElement, verify: ButtonToVerify['verify']) {
    if (!element) {
      return;
    }

    this.buttonsToVerify.push({ element, verify });
  }

  private verifyButtons = (e?: Event) => {
    const isMenuOpen = !!e || !!(this.btnMore && this.btnMore.classList.contains('menu-open'));

    e && cancelEvent(e);

    const r = async () => {
      const deleteButtonText = await this.managers.appPeersManager.getDeleteButtonText(this.peerId);
      if (isMenuOpen) {
        // delete button
        this.menuButtons[this.menuButtons.length - 1].element.lastChild.replaceWith(i18n(deleteButtonText));
      }

      const buttons = this.buttonsToVerify.concat(isMenuOpen ? this.menuButtons : []);
      const results = await Promise.all(buttons.map(async (button) => {
        return {
          result: await button.verify(),
          button
        }
      }));

      results.forEach(({ button, result }) => {
        button.element.classList.toggle('hide', !result);
      });
    };

    r();
  };

  private verifyVideoChatButton = async (type?: 'group' | 'broadcast') => {
    if (!IS_GROUP_CALL_SUPPORTED || this.peerId.isUser()) return false;

    const currentGroupCall = groupCallsController.groupCall;
    const chatId = this.peerId.toChatId();
    if (currentGroupCall?.chatId === chatId) {
      return false;
    }

    if (type) {
      if (((await this.managers.appPeersManager.isBroadcast(this.peerId)) && type === 'group') ||
        ((await this.managers.appPeersManager.isAnyGroup(this.peerId)) && type === 'broadcast')) {
        return false;
      }
    }

    const chat = await this.managers.appChatsManager.getChatTyped(chatId);
    return (chat as MTChat.chat).pFlags?.call_active || hasRights(chat, 'manage_call');
  };

  private verifyCallButton = async (type?: CallType) => {
    if (!IS_CALL_SUPPORTED || !this.peerId.isUser()) return false;
    const userId = this.peerId.toUserId();
    const userFull = await this.managers.appProfileManager.getCachedFullUser(userId);

    return !!userFull && !!(type === 'voice' ? userFull.pFlags.phone_calls_available : userFull.pFlags.video_calls_available);
  };

  public constructUtils() {
    this.menuButtons = [{
      icon: 'search',
      text: 'Search',
      onClick: () => {
        this.chat.initSearch();
      },
      verify: () => mediaSizes.isMobile
    }, /* {
      icon: 'pinlist',
      text: 'Pinned Messages',
      onClick: () => this.openPinned(false),
      verify: () => mediaSizes.isMobile
    }, */{
      icon: 'mute',
      text: 'ChatList.Context.Mute',
      onClick: this.onMuteClick,
      verify: async () => this.chat.type === 'chat' && rootScope.myId !== this.peerId && !(await this.managers.appNotificationsManager.isPeerLocalMuted(this.peerId, false))
    }, {
      icon: 'unmute',
      text: 'ChatList.Context.Unmute',
      onClick: () => {
        this.managers.appMessagesManager.togglePeerMute(this.peerId);
      },
      verify: async () => this.chat.type === 'chat' && rootScope.myId !== this.peerId && (await this.managers.appNotificationsManager.isPeerLocalMuted(this.peerId, false))
    }, {
      icon: 'comments',
      text: 'ViewDiscussion',
      onClick: () => {
        const middleware = this.chat.bubbles.getMiddleware();
        Promise.resolve(this.managers.appProfileManager.getChannelFull(this.peerId.toChatId())).then((channelFull) => {
          if (middleware() && channelFull.linked_chat_id) {
            this.chat.appImManager.setInnerPeer({
              peerId: channelFull.linked_chat_id.toPeerId(true)
            });
          }
        });
      },
      verify: async () => {
        const chatFull = await this.managers.appProfileManager.getCachedFullChat(this.peerId.toChatId());
        return this.chat.type === 'chat' && !!(chatFull as ChatFull.channelFull)?.linked_chat_id;
      }
    }, {
      icon: 'phone',
      text: 'Call',
      onClick: this.onCallClick.bind(this, 'voice'),
      verify: this.verifyCallButton.bind(this, 'voice')
    }, {
      icon: 'videocamera',
      text: 'VideoCall',
      onClick: this.onCallClick.bind(this, 'video'),
      verify: this.verifyCallButton.bind(this, 'video')
    }, {
      icon: 'videochat',
      text: 'PeerInfo.Action.LiveStream',
      onClick: this.onJoinGroupCallClick,
      verify: this.verifyVideoChatButton.bind(this, 'broadcast')
    }, {
      icon: 'videochat',
      text: 'PeerInfo.Action.VoiceChat',
      onClick: this.onJoinGroupCallClick,
      verify: this.verifyVideoChatButton.bind(this, 'group')
    }, {
      icon: 'select',
      text: 'Chat.Menu.SelectMessages',
      onClick: () => {
        const selection = this.chat.selection;
        selection.toggleSelection(true, true);
        apiManagerProxy.getState().then((state) => {
          if (state.chatContextMenuHintWasShown) {
            return;
          }

          const original = selection.toggleByElement.bind(selection);
          selection.toggleByElement = async (bubble) => {
            this.managers.appStateManager.pushToState('chatContextMenuHintWasShown', true);
            toast(i18n('Chat.Menu.Hint'));

            selection.toggleByElement = original;
            selection.toggleByElement(bubble);
          };
        });
      },
      verify: () => !this.chat.selection.isSelecting && !!this.chat.bubbles.getRenderedLength()
    }, {
      icon: 'select',
      text: 'Chat.Menu.ClearSelection',
      onClick: () => {
        this.chat.selection.cancelSelection();
      },
      verify: () => this.chat.selection.isSelecting
    }, {
      icon: 'adduser',
      text: 'AddContact',
      onClick: () => {
        if (!this.appSidebarRight.isTabExists(AppEditContactTab)) {
          const tab = this.appSidebarRight.createTab(AppEditContactTab);
          tab.peerId = this.peerId;
          tab.open();

          this.appSidebarRight.toggleSidebar(true);
        }
      },
      verify: async () => this.peerId.isUser() && !(await this.managers.appPeersManager.isContact(this.peerId))
    }, {
      icon: 'forward',
      text: 'ShareContact',
      onClick: () => {
        const contactPeerId = this.peerId;
        new PopupPickUser({
          peerTypes: ['dialogs', 'contacts'],
          onSelect: (peerId) => {
            return new Promise((resolve, reject) => {
              new PopupPeer('', {
                titleLangKey: 'SendMessageTitle',
                descriptionLangKey: 'SendContactToGroupText',
                descriptionLangArgs: [new PeerTitle({ peerId, dialog: true }).element],
                buttons: [{
                  langKey: 'Send',
                  callback: () => {
                    resolve();

                    this.managers.appMessagesManager.sendContact(peerId, contactPeerId);
                    this.chat.appImManager.setInnerPeer({ peerId });
                  }
                }, {
                  langKey: 'Cancel',
                  callback: () => {
                    reject();
                  },
                  isCancel: true,
                }],
                peerId,
                overlayClosable: true
              }).show();
            });
          },
          placeholder: 'ShareModal.Search.Placeholder',
          chatRightsAction: 'send_messages',
          selfPresence: 'ChatYourSelf'
        });
      },
      verify: async () => rootScope.myId !== this.peerId && this.peerId.isUser() && (await this.managers.appPeersManager.isContact(this.peerId)) && !!(await this.managers.appUsersManager.getUser(this.peerId.toUserId())).phone
    }, {
      icon: 'lock',
      text: 'BlockUser',
      onClick: () => {
        new PopupPeer('', {
          peerId: this.peerId,
          titleLangKey: 'BlockUser',
          descriptionLangKey: 'AreYouSureBlockContact2',
          descriptionLangArgs: [new PeerTitle({ peerId: this.peerId }).element],
          buttons: [{
            langKey: 'BlockUser',
            isDanger: true,
            callback: () => {
              this.managers.appUsersManager.toggleBlock(this.peerId, true).then((value) => {
                if (value) {
                  toastNew({ langPackKey: 'UserBlocked' });
                }
              });
            }
          }]
        }).show();
      },
      verify: async () => {
        if (!this.peerId.isUser()) return false;
        const userFull = await this.managers.appProfileManager.getCachedFullUser(this.peerId.toUserId());
        return this.peerId !== rootScope.myId && userFull && !userFull.pFlags?.blocked;
      }
    }, {
      icon: 'lockoff',
      text: 'Unblock',
      onClick: () => {
        this.managers.appUsersManager.toggleBlock(this.peerId, false).then((value) => {
          if (value) {
            toastNew({ langPackKey: 'UserUnblocked' });
          }
        });
      },
      verify: async () => {
        const userFull = await this.managers.appProfileManager.getCachedFullUser(this.peerId.toUserId());
        return !!userFull?.pFlags?.blocked;
      }
    }, {
      icon: 'delete danger',
      text: 'Delete',
      onClick: () => {
        new PopupDeleteDialog(this.peerId/* , 'leave' */);
      },
      verify: async () => this.chat.type === 'chat' && !!(await this.managers.appMessagesManager.getDialogOnly(this.peerId))
    }];

    this.btnSearch = ButtonIcon('search');
    this.attachClickEvent(this.btnSearch, (e) => {
      this.chat.initSearch();
    }, true);
  }

  public attachClickEvent(el: HTMLElement, cb: (e: MouseEvent) => void, noBlur?: boolean) {
    attachClickEvent(el, (e) => {
      cancelEvent(e);
      !noBlur && blurActiveElement();
      cb(e);
    }, { listenerSetter: this.listenerSetter });
  }

  private onCallClick(type: CallType) {
    this.chat.appImManager.callUser(this.peerId.toUserId(), type);
  }

  private onJoinGroupCallClick = () => {
    this.chat.appImManager.joinGroupCall(this.peerId);
  };

  private constructAvatar() {
    const avatarElement = new AvatarElement();
    avatarElement.isDialog = true;
    avatarElement.classList.add('avatar-42', 'person-avatar');
    return avatarElement;
  }

  private get peerId() {
    return this.chat.peerId;
  }

  public constructPeerHelpers() {
    this.avatarElement = this.constructAvatar();

    this.subtitle = document.createElement('div');
    this.subtitle.classList.add('info');

    this.pinnedMessage = new ChatPinnedMessage(this, this.chat, this.managers);

    this.btnJoin = Button('btn-primary btn-color-primary chat-join hide');
    this.btnCall = ButtonIcon('phone');
    this.btnGroupCall = ButtonIcon('videochat');
    this.btnPinned = ButtonIcon('pinlist');
    this.btnMute = ButtonIcon('mute');

    this.attachClickEvent(this.btnCall, this.onCallClick.bind(this, 'voice'));
    this.attachClickEvent(this.btnGroupCall, this.onJoinGroupCallClick);

    this.attachClickEvent(this.btnPinned, () => {
      this.openPinned(true);
    });

    this.attachClickEvent(this.btnMute, this.onMuteClick);

    this.attachClickEvent(this.btnJoin, async () => {
      const middleware = this.chat.bubbles.getMiddleware();
      this.btnJoin.setAttribute('disabled', 'true');

      const chatId = this.peerId.toChatId();
      let promise: Promise<any>;
      if (await this.managers.appChatsManager.isChannel(chatId)) {
        promise = this.managers.appChatsManager.joinChannel(chatId);
      } else {
        promise = this.managers.appChatsManager.addChatUser(chatId, rootScope.myId);
      }

      promise.finally(() => {
        if (!middleware()) {
          return;
        }

        this.btnJoin.removeAttribute('disabled');
      });
    });

    this.listenerSetter.add(rootScope)('chat_update', async (chatId) => {
      if (this.peerId === chatId.toPeerId(true)) {
        const chat = await this.managers.appChatsManager.getChat(chatId) as Channel/*  | Chat */;

        this.btnJoin.classList.toggle('hide', !(chat as Channel)?.pFlags?.left);
        this.setUtilsWidth();
        this.verifyButtons();
      }
    });

    this.listenerSetter.add(rootScope)('dialog_notify_settings', (dialog) => {
      if (dialog.peerId === this.peerId) {
        this.setMutedState();
      }
    });

    this.listenerSetter.add(rootScope)('peer_typings', ({ peerId }) => {
      if (this.peerId === peerId) {
        this.setPeerStatus();
      }
    });

    this.listenerSetter.add(rootScope)('user_update', (userId) => {
      if (this.peerId === userId.toPeerId()) {
        this.setPeerStatus();
      }
    });

    this.listenerSetter.add(rootScope)('peer_full_update', (peerId) => {
      if (this.peerId === peerId) {
        this.verifyButtons();
      }
    });

    if (this.pinnedMessage) {
      this.chat.addEventListener('setPeer', (mid, isTopMessage) => {
        const middleware = this.chat.bubbles.getMiddleware();
        apiManagerProxy.getState().then((state) => {
          if (!middleware()) return;

          this.pinnedMessage.hidden = !!state.hiddenPinnedMessages[this.chat.peerId];

          if (isTopMessage) {
            this.pinnedMessage.unsetScrollDownListener();
            this.pinnedMessage.testMid(mid, 0); // * because slider will not let get bubble by document.elementFromPoint
          } else if (!this.pinnedMessage.locked) {
            this.pinnedMessage.handleFollowingPinnedMessage();
            this.pinnedMessage.testMid(mid);
          }
        });
      });
    }

    this.setPeerStatusInterval = window.setInterval(this.setPeerStatus, 60e3);

    return this;
  }

  public constructPinnedHelpers() {
    this.listenerSetter.add(rootScope)('peer_pinned_messages', ({ peerId, mids }) => {
      if (peerId !== this.peerId) return;

      if (mids) {
        this.setTitle();
      }
    });
  }

  public constructDiscussionHelpers() {
    this.pinnedMessage = new ChatPinnedMessage(this, this.chat, this.managers);
  }

  public openPinned(byCurrent: boolean) {
    this.chat.appImManager.setInnerPeer({
      peerId: this.peerId,
      lastMsgId: byCurrent ? +this.pinnedMessage.pinnedMessageContainer.divAndCaption.container.dataset.mid : 0,
      type: 'pinned'
    });
  }

  private onMuteClick = () => {
    new PopupMute(this.peerId);
  };

  private onResize = () => {
    this.setUtilsWidth(true);
    this.setFloating();
  };

  private onChangeScreen = (from: ScreenSize, to: ScreenSize) => {
    this.container.classList.toggle('is-pinned-floating', mediaSizes.isMobile);
    // this.chatAudio && this.chatAudio.divAndCaption.container.classList.toggle('is-floating', to === ScreenSize.mobile);
    this.pinnedMessage && this.pinnedMessage.pinnedMessageContainer.divAndCaption.container.classList.toggle('is-floating', to === ScreenSize.mobile);
    this.onResize();
  };

  public destroy() {
    //this.chat.log.error('Topbar destroying');
    this.listenerSetter.removeAll();
    window.clearInterval(this.setPeerStatusInterval);

    if (this.pinnedMessage) {
      this.pinnedMessage.destroy(); // * возможно это можно не делать
    }

    if (this.chatAudio) {
      this.chatAudio.destroy();
    }

    delete this.chatAudio;
    delete this.pinnedMessage;
  }

  public cleanup() {
    if (!this.chat.peerId) {
      this.container.classList.add('hide');
    }
  }

  public async finishPeerChange(isTarget: boolean) {
    const peerId = this.peerId;

    let newAvatar: AvatarElement;
    if (this.avatarElement) {
      newAvatar = this.constructAvatar();
    }

    const [isBroadcast, isAnyChat, chat, _, setTitleCallback, setStatusCallback, state] = await Promise.all([
      this.managers.appPeersManager.isBroadcast(peerId),
      this.managers.appPeersManager.isAnyChat(peerId),
      peerId.isAnyChat() ? this.managers.appChatsManager.getChat(peerId.toChatId()) : undefined,
      newAvatar ? newAvatar.updateWithOptions({ peerId }) : undefined,
      this.setTitleManual(),
      this.setPeerStatusManual(true),
      apiManagerProxy.getState()
    ]);

    return () => {
      this.btnMute && this.btnMute.classList.toggle('hide', !isBroadcast);
      if (this.btnJoin) {
        if (isAnyChat) {
          replaceContent(this.btnJoin, i18n(isBroadcast ? 'Chat.Subscribe' : 'ChannelJoin'));
          this.btnJoin.classList.toggle('hide', !chat?.pFlags?.left);
        } else {
          this.btnJoin.classList.add('hide');
        }
      }

      if (newAvatar) {
        this.avatarElement.replaceWith(newAvatar);
        this.avatarElement = newAvatar;
      }

      this.setUtilsWidth();

      this.verifyButtons();

      if (this.pinnedMessage) { // * replace with new one
        if (this.chat.type === 'chat') {
          if (this.chat.wasAlreadyUsed) { // * change
            const newPinnedMessage = new ChatPinnedMessage(this, this.chat, this.managers);
            this.pinnedMessage.pinnedMessageContainer.divAndCaption.container.replaceWith(newPinnedMessage.pinnedMessageContainer.divAndCaption.container);
            this.pinnedMessage.destroy();
            //this.pinnedMessage.pinnedMessageContainer.toggle(true);
            this.pinnedMessage = newPinnedMessage;
          }

          this.pinnedMessage.hidden = !!state.hiddenPinnedMessages[peerId];
        } else if (this.chat.type === 'discussion') {
          this.pinnedMessage.pinnedMid = this.chat.threadId;
          this.pinnedMessage.count = 1;
          this.pinnedMessage.pinnedIndex = 0;
          this.pinnedMessage._setPinnedMessage();
        }
      }

      setTitleCallback();
      setStatusCallback && setStatusCallback();
      this.setMutedState();

      this.container.classList.remove('hide');
      CRMDialog.dialogChanged();
      crmOperator.dialogOpened();
    };
  }

  public async setTitleManual(count?: number) {
    const peerId = this.peerId;
    const middleware = () => this.peerId === peerId;
    let titleEl: HTMLElement, icons: Element[];
    if (this.chat.type === 'pinned') {
      if (count === undefined) titleEl = i18n('Loading');
      else titleEl = i18n('PinnedMessagesCount', [count]);

      if (count === undefined) {
        this.managers.appMessagesManager.getSearchCounters(peerId, [{ _: 'inputMessagesFilterPinned' }], false).then((result) => {
          if (!middleware()) return;
          const count = result[0].count;
          this.setTitle(count);

          // ! костыль х2, это нужно делать в другом месте
          if (!count) {
            this.chat.appImManager.setPeer(); // * close tab

            // ! костыль, это скроет закреплённые сообщения сразу, вместо того, чтобы ждать пока анимация перехода закончится
            const originalChat = this.chat.appImManager.chat;
            if (originalChat.topbar.pinnedMessage) {
              originalChat.topbar.pinnedMessage.pinnedMessageContainer.toggle(true);
            }
          }
        });
      }
    } else if (this.chat.type === 'scheduled') {
      titleEl = i18n(peerId === rootScope.myId ? 'Reminders' : 'ScheduledMessages');
    } else if (this.chat.type === 'discussion') {
      if (count === undefined) {
        const result = await this.managers.acknowledged.appMessagesManager.getHistory(peerId, 0, 1, 0, this.chat.threadId);
        if (result.cached) {
          const historyResult = await result.result;
          count = historyResult.count;
        } else result.result.then((historyResult) => this.setTitle(historyResult.count));
      }

      if (count === undefined) titleEl = i18n('Loading');
      else titleEl = i18n('Chat.Title.Comments', [count]);
    } else if (this.chat.type === 'chat') {
      [titleEl, icons] = await Promise.all([
        wrapPeerTitle({
          peerId,
          dialog: true
        }),
        generateTitleIcons(peerId)
      ]);

      if (!middleware()) {
        return;
      }
    }

    return () => {
      replaceContent(this.title, "Пользователь");
      if (icons) {
        this.title.append(...icons);
      }
    };
  }

  public setTitle(count?: number) {
    this.setTitleManual(count).then((setTitleCallback) => setTitleCallback());
  }

  public async setMutedState() {
    if (!this.btnMute) return;

    const peerId = this.peerId;
    let muted = await this.managers.appNotificationsManager.isPeerLocalMuted(peerId, false);
    if (await this.managers.appPeersManager.isBroadcast(peerId)) { // not human
      this.btnMute.classList.remove('tgico-mute', 'tgico-unmute');
      this.btnMute.classList.add(muted ? 'tgico-unmute' : 'tgico-mute');
      this.btnMute.style.display = '';
    } else {
      this.btnMute.style.display = 'none';
    }
  }

  // ! У МЕНЯ ПРОСТО СГОРЕЛО, САФАРИ КОНЧЕННЫЙ БРАУЗЕР - ЕСЛИ НЕ СКРЫВАТЬ БЛОК, ТО ПРИ ПЕРЕВОРОТЕ ЭКРАНА НА АЙФОНЕ БЛОК БУДЕТ НЕПРАВИЛЬНО ШИРИНЫ, ДАЖЕ БЕЗ ЭТОЙ ФУНКЦИИ!
  public setUtilsWidth = (resize = false) => {
    //return;
    if (this.setUtilsRAF) window.cancelAnimationFrame(this.setUtilsRAF);

    if (IS_SAFARI && resize) {
      this.chatUtils.classList.add('hide');
    }

    //mutationObserver.disconnect();
    this.setUtilsRAF = window.requestAnimationFrame(() => {

      //mutationRAF = window.requestAnimationFrame(() => {

      //setTimeout(() => {
      if (IS_SAFARI && resize) {
        this.chatUtils.classList.remove('hide');
      }
      /* this.chatInfo.style.removeProperty('--utils-width');
      void this.chatInfo.offsetLeft; // reflow */
      const width = /* chatUtils.scrollWidth */this.chatUtils.getBoundingClientRect().width;
      this.chat.log('utils width:', width);
      this.container.style.setProperty('--utils-width', width + 'px');
      //this.chatInfo.classList.toggle('have-utils-width', !!width);
      //}, 0);

      this.setUtilsRAF = 0;

      //mutationObserver.observe(chatUtils, observeOptions);
      //});
    });
  };

  public setFloating = () => {
    const containers = [this.chatAudio, this.pinnedMessage && this.pinnedMessage.pinnedMessageContainer].filter(Boolean);
    const count = containers.reduce((acc, container) => {
      const isFloating = container.isFloating();
      this.container.classList.toggle(`is-pinned-${container.className}-floating`, isFloating);

      if (!container.isVisible()) {
        return acc;
      }

      return acc + +isFloating;
    }, 0);
    this.container.dataset.floating = '' + count;
  };

  public setPeerStatusManual = async (needClear = false) => {
    if (!this.subtitle) return;

    const peerId = this.peerId;
    return this.chat.appImManager.setPeerStatus(
      peerId,
      this.subtitle,
      needClear,
      false,
      () => peerId === this.peerId
    );
  };

  public setPeerStatus = (needClear?: boolean) => {
    return this.setPeerStatusManual(needClear).then((callback) => {
      if (callback) {
        callback();
      }
    });
  };
}
