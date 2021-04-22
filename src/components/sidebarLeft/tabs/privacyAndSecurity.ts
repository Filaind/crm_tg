/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import { SliderSuperTab } from "../../slider";
import { SettingSection } from "..";
import Row from "../../row";
import { AccountPassword, Authorization, InputPrivacyKey } from "../../../layer";
import appPrivacyManager, { PrivacyType } from "../../../lib/appManagers/appPrivacyManager";
import AppPrivacyPhoneNumberTab from "./privacy/phoneNumber";
import AppTwoStepVerificationTab from "./2fa";
import passwordManager from "../../../lib/mtproto/passwordManager";
import AppTwoStepVerificationEnterPasswordTab from "./2fa/enterPassword";
import AppTwoStepVerificationEmailConfirmationTab from "./2fa/emailConfirmation";
import AppPrivacyLastSeenTab from "./privacy/lastSeen";
import AppPrivacyProfilePhotoTab from "./privacy/profilePhoto";
import AppPrivacyForwardMessagesTab from "./privacy/forwardMessages";
import AppPrivacyAddToGroupsTab from "./privacy/addToGroups";
import AppPrivacyCallsTab from "./privacy/calls";
import AppActiveSessionsTab from "./activeSessions";
import apiManager from "../../../lib/mtproto/mtprotoworker";
import AppBlockedUsersTab from "./blockedUsers";
import appUsersManager from "../../../lib/appManagers/appUsersManager";
import rootScope from "../../../lib/rootScope";
import { convertKeyToInputKey } from "../../../helpers/string";
import { i18n, LangPackKey, _i18n } from "../../../lib/langPack";
import { replaceContent } from "../../../helpers/dom";

export default class AppPrivacyAndSecurityTab extends SliderSuperTab {
  private activeSessionsRow: Row;
  private authorizations: Authorization.authorization[];

  protected init() {
    this.container.classList.add('privacy-container');
    this.setTitle('PrivacySettings');

    const SUBTITLE: LangPackKey = 'Loading';

    {
      const section = new SettingSection({noDelimiter: true});

      let blockedPeerIds: number[];
      const blockedUsersRow = new Row({
        icon: 'deleteuser',
        titleLangKey: 'BlockedUsers',
        subtitleLangKey: SUBTITLE,
        clickable: () => {
          const tab = new AppBlockedUsersTab(this.slider);
          tab.peerIds = blockedPeerIds;
          tab.open();
        }
      });
      blockedUsersRow.freezed = true;

      let passwordState: AccountPassword;
      const twoFactorRowOptions = {
        icon: 'lock',
        titleLangKey: 'TwoStepVerification' as LangPackKey,
        subtitleLangKey: SUBTITLE,
        clickable: (e: Event) => {
          let tab: AppTwoStepVerificationTab | AppTwoStepVerificationEnterPasswordTab | AppTwoStepVerificationEmailConfirmationTab;
          if(passwordState.pFlags.has_password) {
            tab = new AppTwoStepVerificationEnterPasswordTab(this.slider);
          } else if(passwordState.email_unconfirmed_pattern) {
            tab = new AppTwoStepVerificationEmailConfirmationTab(this.slider);
            tab.email = passwordState.email_unconfirmed_pattern;
            tab.length = 6;
            tab.isFirst = true;
            passwordManager.resendPasswordEmail();
          } else {
            tab = new AppTwoStepVerificationTab(this.slider);
          }
          
          tab.state = passwordState;
          tab.open();
        }
      };
      
      const twoFactorRow = new Row(twoFactorRowOptions);
      twoFactorRow.freezed = true;

      const activeSessionsRow = this.activeSessionsRow = new Row({
        icon: 'activesessions',
        titleLangKey: 'SessionsTitle',
        subtitleLangKey: SUBTITLE,
        clickable: () => {
          const tab = new AppActiveSessionsTab(this.slider);
          tab.privacyTab = this;
          tab.authorizations = this.authorizations;
          tab.open();
        }
      });
      activeSessionsRow.freezed = true;

      section.content.append(blockedUsersRow.container, twoFactorRow.container, activeSessionsRow.container);
      this.scrollable.append(section.container);

      const setBlockedCount = (count: number) => {
        if(count) {
          replaceContent(blockedUsersRow.subtitle, i18n('PrivacySettingsController.UserCount', [count]));
        } else {
          replaceContent(blockedUsersRow.subtitle, i18n('BlockedEmpty', [count]));
        }
      };

      this.listenerSetter.add(rootScope, 'peer_block', () => {
        /* const {blocked, peerId} = update;
        if(!blocked) blockedPeerIds.findAndSplice(p => p === peerId);
        else blockedPeerIds.unshift(peerId);
        blockedCount += blocked ? 1 : -1;
        setBlockedCount(blockedCount); */
        updateBlocked();
      });

      const updateBlocked = () => {
        appUsersManager.getBlocked().then(res => {
          blockedUsersRow.freezed = false;
          setBlockedCount(res.count);
          blockedPeerIds = res.peerIds;
        });
      };

      updateBlocked();

      passwordManager.getState().then(state => {
        passwordState = state;
        replaceContent(twoFactorRow.subtitle, i18n(state.pFlags.has_password ? 'PrivacyAndSecurity.Item.On' : 'PrivacyAndSecurity.Item.Off'));
        twoFactorRow.freezed = false;
        
        //console.log('password state', state);
      });

      this.updateActiveSessions();
    }

    {
      const section = new SettingSection({name: 'PrivacyTitle'});

      section.content.classList.add('privacy-navigation-container');

      const rowsByKeys: Partial<{
        [key in InputPrivacyKey['_']]: Row
      }> = {};

      const numberVisibilityRow = rowsByKeys['inputPrivacyKeyPhoneNumber'] = new Row({
        titleLangKey: 'PrivacyPhoneTitle',
        subtitleLangKey: SUBTITLE,
        clickable: () => {
          new AppPrivacyPhoneNumberTab(this.slider).open();
        }
      });

      const lastSeenTimeRow = rowsByKeys['inputPrivacyKeyStatusTimestamp'] = new Row({
        titleLangKey: 'LastSeenTitle',
        subtitleLangKey: SUBTITLE,
        clickable: () => {
          new AppPrivacyLastSeenTab(this.slider).open();
        }
      });

      const photoVisibilityRow = rowsByKeys['inputPrivacyKeyProfilePhoto'] = new Row({
        titleLangKey: 'PrivacyProfilePhotoTitle',
        subtitleLangKey: SUBTITLE,
        clickable: () => {
          new AppPrivacyProfilePhotoTab(this.slider).open();
        }
      });

      const callRow = rowsByKeys['inputPrivacyKeyPhoneCall'] = new Row({
        titleLangKey: 'WhoCanCallMe',
        subtitleLangKey: SUBTITLE,
        clickable: () => {
          new AppPrivacyCallsTab(this.slider).open();
        }
      });

      const linkAccountRow = rowsByKeys['inputPrivacyKeyForwards'] = new Row({
        titleLangKey: 'PrivacyForwardsTitle',
        subtitleLangKey: SUBTITLE,
        clickable: () => {
          new AppPrivacyForwardMessagesTab(this.slider).open();
        }
      });

      const groupChatsAddRow = rowsByKeys['inputPrivacyKeyChatInvite'] = new Row({
        titleLangKey: 'WhoCanAddMe',
        subtitleLangKey: SUBTITLE,
        clickable: () => {
          new AppPrivacyAddToGroupsTab(this.slider).open();
        }
      });

      const updatePrivacyRow = (key: InputPrivacyKey['_']) => {
        const row = rowsByKeys[key];
        if(!row) {
          return;
        }

        appPrivacyManager.getPrivacy(key).then(rules => {
          const details = appPrivacyManager.getPrivacyRulesDetails(rules);
          const langKey = details.type === PrivacyType.Everybody ? 'PrivacySettingsController.Everbody' : (details.type === PrivacyType.Contacts ? 'PrivacySettingsController.MyContacts' : 'PrivacySettingsController.Nobody');
          const disallowLength = details.disallowPeers.users.length + details.disallowPeers.chats.length;
          const allowLength = details.allowPeers.users.length + details.allowPeers.chats.length;

          row.subtitle.innerHTML = '';
          const s = i18n(langKey);
          row.subtitle.append(s);
          if(disallowLength || allowLength) {
            row.subtitle.append(` (${[-disallowLength, allowLength ? '+' + allowLength : 0].filter(Boolean).join(', ')})`);
          }
        });
      };

      section.content.append(numberVisibilityRow.container, lastSeenTimeRow.container, photoVisibilityRow.container, callRow.container, linkAccountRow.container, groupChatsAddRow.container);
      this.scrollable.append(section.container);

      for(const key in rowsByKeys) {
        updatePrivacyRow(key as keyof typeof rowsByKeys);
      }

      rootScope.on('privacy_update', (update) => {
        updatePrivacyRow(convertKeyToInputKey(update.key._) as any);
      });
    }
  }

  public updateActiveSessions() {
    apiManager.invokeApi('account.getAuthorizations').then(auths => {
      this.activeSessionsRow.freezed = false;
      this.authorizations = auths.authorizations;
      _i18n(this.activeSessionsRow.subtitle, 'Privacy.Devices', [this.authorizations.length]);
      //console.log('auths', auths);
    });
  }
}
