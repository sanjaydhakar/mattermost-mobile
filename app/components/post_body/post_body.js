// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Keyboard,
    ScrollView,
    View,
    Text,
} from 'react-native';
import {intlShape} from 'react-intl';
import Icon from 'react-native-vector-icons/Ionicons';
import {Posts} from '@mm-redux/constants';

import CombinedSystemMessage from 'app/components/combined_system_message';
import {renderSystemMessage} from './system_message_helpers';
import FormattedText from 'app/components/formatted_text';
import Markdown from 'app/components/markdown';
import MarkdownEmoji from 'app/components/markdown/markdown_emoji';
import ShowMoreButton from 'app/components/show_more_button';
import TouchableWithFeedback from 'app/components/touchable_with_feedback';

import {emptyFunction} from 'app/utils/general';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from 'app/utils/markdown';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {showModalOverCurrentContext} from 'app/actions/navigation';

import ReplyIcon from 'app/components/reply_icon';
import RecentDate from 'app/components/recent_date';
import FormattedTime from 'app/components/formatted_time';

import telemetry from 'app/telemetry';

let FileAttachmentList;
let PostAddChannelMember;
let PostBodyAdditionalContent;
let Reactions;

const SHOW_MORE_HEIGHT = 60;

export default class PostBody extends PureComponent {
    static propTypes = {
        canDelete: PropTypes.bool,
        channelIsReadOnly: PropTypes.bool.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        fileIds: PropTypes.array,
        hasBeenDeleted: PropTypes.bool,
        hasBeenEdited: PropTypes.bool,
        hasReactions: PropTypes.bool,
        highlight: PropTypes.bool,
        isFailed: PropTypes.bool,
        isFlagged: PropTypes.bool,
        isLastPost: PropTypes.bool,
        isPending: PropTypes.bool,
        isPostAddChannelMember: PropTypes.bool,
        isPostEphemeral: PropTypes.bool,
        isReplyPost: PropTypes.bool,
        isSearchResult: PropTypes.bool,
        isSystemMessage: PropTypes.bool,
        metadata: PropTypes.object,
        managedConfig: PropTypes.object,
        message: PropTypes.string,
        onFailedPostPress: PropTypes.func,
        onHashtagPress: PropTypes.func,
        onPermalinkPress: PropTypes.func,
        onPress: PropTypes.func,
        post: PropTypes.object.isRequired,
        postProps: PropTypes.object.isRequired,
        postType: PropTypes.string,
        replyBarStyle: PropTypes.array,
        showAddReaction: PropTypes.bool,
        showLongPost: PropTypes.bool.isRequired,
        isEmojiOnly: PropTypes.bool.isRequired,
        shouldRenderJumboEmoji: PropTypes.bool.isRequired,
        theme: PropTypes.object,
        location: PropTypes.string,
        commentCount: PropTypes.number,
        commentedOnDisplayName: PropTypes.string,
        renderReplies: PropTypes.bool,
        shouldRenderReplyButton: PropTypes.bool,
        lastReplyCreatedAt: PropTypes.number,
        userTimezone: PropTypes.string,
        militaryTime: PropTypes.bool,
    };

    static defaultProps = {
        fileIds: [],
        onFailedPostPress: emptyFunction,
        onPress: emptyFunction,
        replyBarStyle: [],
        message: '',
        postProps: {},
        commentCount: 0,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    static getDerivedStateFromProps(nextProps, prevState) {
        const maxHeight = Math.round((nextProps.deviceHeight * 0.6) + SHOW_MORE_HEIGHT);
        if (maxHeight !== prevState.maxHeight) {
            return {
                maxHeight,
            };
        }

        return null;
    }

    state = {
        isLongPost: false,
    };

    logTelemetry = () => {
        telemetry.end([
            'channel:switch_initial',
            'channel:switch_loaded',
            'post_list:permalink',
            'post_list:thread',
            'team:switch',
            'start:overall',
        ]);
        telemetry.save();
    }

    measurePost = (event) => {
        const {height} = event.nativeEvent.layout;
        const {showLongPost} = this.props;

        if (!showLongPost) {
            this.setState({
                isLongPost: height >= this.state.maxHeight,
            });
        }

        if (this.props.isLastPost) {
            this.logTelemetry();
        }
    };

    openLongPost = preventDoubleTap(() => {
        const {
            managedConfig,
            onHashtagPress,
            onPermalinkPress,
            post,
        } = this.props;
        const screen = 'LongPost';
        const passProps = {
            postId: post.id,
            managedConfig,
            onHashtagPress,
            onPermalinkPress,
        };
        const options = {
            layout: {
                componentBackgroundColor: changeOpacity('#000', 0.2),
            },
        };

        showModalOverCurrentContext(screen, passProps, options);
    });

    showPostOptions = () => {
        const {
            canDelete,
            channelIsReadOnly,
            hasBeenDeleted,
            isFailed,
            isFlagged,
            isPending,
            isPostEphemeral,
            isSystemMessage,
            managedConfig,
            post,
            showAddReaction,
            location,
        } = this.props;

        if (isSystemMessage && (!canDelete || hasBeenDeleted)) {
            return;
        }

        if (isPending || isFailed || isPostEphemeral) {
            return;
        }

        const screen = 'PostOptions';
        const passProps = {
            canDelete,
            channelIsReadOnly,
            hasBeenDeleted,
            isFlagged,
            isSystemMessage,
            post,
            managedConfig,
            showAddReaction,
            location,
        };

        Keyboard.dismiss();
        requestAnimationFrame(() => {
            showModalOverCurrentContext(screen, passProps);
        });
    };

    renderAddChannelMember = (messageStyle, textStyles) => {
        const {onPress, postProps} = this.props;

        if (!PostAddChannelMember) {
            PostAddChannelMember = require('app/components/post_add_channel_member').default;
        }

        const postId = postProps.add_channel_member.post_id;
        const noGroupsUsernames = postProps.add_channel_member?.not_in_groups_usernames; // eslint-disable-line camelcase
        let userIds = postProps.add_channel_member?.not_in_channel_user_ids; // eslint-disable-line camelcase
        let usernames = postProps.add_channel_member?.not_in_channel_usernames; // eslint-disable-line camelcase

        if (!userIds) {
            userIds = postProps.add_channel_member?.user_ids; // eslint-disable-line camelcase
        }
        if (!usernames) {
            usernames = postProps.add_channel_member?.usernames;
        }

        return (
            <PostAddChannelMember
                baseTextStyle={messageStyle}
                onPostPress={onPress}
                textStyles={textStyles}
                postId={postId}
                userIds={userIds}
                usernames={usernames}
                noGroupsUsernames={noGroupsUsernames}
            />
        );
    };

    renderFileAttachments() {
        const {
            fileIds,
            isFailed,
            post,
            showLongPost,
        } = this.props;

        if (showLongPost) {
            return null;
        }

        let attachments;
        if (fileIds.length) {
            if (!FileAttachmentList) {
                FileAttachmentList = require('app/components/file_attachment_list').default;
            }

            attachments = (
                <FileAttachmentList
                    fileIds={fileIds}
                    isFailed={isFailed}
                    onLongPress={this.showPostOptions}
                    postId={post.id}
                    isReplyPost={this.props.isReplyPost}
                />
            );
        }
        return attachments;
    }

    renderPostAdditionalContent = (blockStyles, messageStyle, textStyles) => {
        const {
            isPostEphemeral,
            isReplyPost,
            isSystemMessage,
            message,
            metadata,
            onHashtagPress,
            onPermalinkPress,
            post,
            postProps,
        } = this.props;

        if (isSystemMessage && !isPostEphemeral) {
            return null;
        }

        if (metadata && !metadata.embeds) {
            return null;
        }

        if (!PostBodyAdditionalContent) {
            PostBodyAdditionalContent = require('app/components/post_body_additional_content').default;
        }

        return (
            <PostBodyAdditionalContent
                baseTextStyle={messageStyle}
                blockStyles={blockStyles}
                message={message}
                metadata={metadata}
                postId={post.id}
                postProps={postProps}
                textStyles={textStyles}
                isReplyPost={isReplyPost}
                onHashtagPress={onHashtagPress}
                onPermalinkPress={onPermalinkPress}
            />
        );
    };

    renderReactions = () => {
        const {
            hasReactions,
            isSearchResult,
            post,
            showLongPost,
        } = this.props;
        if (!hasReactions || isSearchResult || showLongPost) {
            return null;
        }

        if (!Reactions) {
            Reactions = require('app/components/reactions').default;
        }

        return (
            <Reactions
                postId={post.id}
            />
        );
    };

    renderReply = () => {
        const {
            commentCount,
            commentedOnDisplayName,
            onPress,
            renderReplies,
            shouldRenderReplyButton,
            theme,
            lastReplyCreatedAt,
            userTimezone,
            militaryTime,
        } = this.props;

        const style = getStyleSheet(theme);
        const showReply = shouldRenderReplyButton || (!commentedOnDisplayName && commentCount > 0 && renderReplies);

        if (!showReply) {
            return null;
        }

        return (
            <View style={style.replyWrapper}>
                <TouchableWithFeedback
                    onPress={onPress}
                    style={style.replyIconContainer}
                    type={'opacity'}
                >
                    <ReplyIcon
                        height={16}
                        width={16}
                        color={theme.linkColor}
                    />
                    <Text style={style.replyText}>{`${commentCount} ${(commentCount > 1) ? 'replies' : 'reply'}`}</Text>

                    <Text style={style.lastReplyAt}>{'Last reply at: '}</Text>
                    <RecentDate
                        style={style.lastReplyDate}
                        timeZone={userTimezone}
                        value={lastReplyCreatedAt}
                    />
                    <FormattedTime
                        timeZone={userTimezone}
                        hour12={!militaryTime}
                        value={lastReplyCreatedAt}
                        style={style.lastReplyTime}
                    />

                </TouchableWithFeedback>
            </View>
        );
    };

    render() {
        const {
            hasBeenDeleted,
            hasBeenEdited,
            highlight,
            isEmojiOnly,
            isFailed,
            isPending,
            isPostAddChannelMember,
            isReplyPost,
            isSearchResult,
            isSystemMessage,
            message,
            metadata,
            onFailedPostPress,
            onHashtagPress,
            onPermalinkPress,
            onPress,
            postProps,
            postType,
            replyBarStyle,
            shouldRenderJumboEmoji,
            showLongPost,
            theme,
        } = this.props;
        const {isLongPost, maxHeight} = this.state;
        const style = getStyleSheet(theme);
        const blockStyles = getMarkdownBlockStyles(theme);
        const textStyles = getMarkdownTextStyles(theme);
        const messageStyle = isSystemMessage ? [style.message, style.systemMessage] : style.message;
        const isPendingOrFailedPost = isPending || isFailed;

        const messageStyles = {messageStyle, textStyles};
        const intl = this.context.intl;
        const systemMessage = renderSystemMessage(this.props, messageStyles, intl);
        if (systemMessage) {
            return systemMessage;
        }

        let body;
        let messageComponent;
        if (hasBeenDeleted) {
            body = (
                <FormattedText
                    style={messageStyle}
                    id='post_body.deleted'
                    defaultMessage='(message deleted)'
                />
            );
        } else if (isPostAddChannelMember) {
            messageComponent = this.renderAddChannelMember(messageStyle, textStyles);
        } else if (postType === Posts.POST_TYPES.COMBINED_USER_ACTIVITY) {
            const {allUserIds, allUsernames, messageData} = postProps.user_activity;
            messageComponent = (
                <CombinedSystemMessage
                    allUserIds={allUserIds}
                    allUsernames={allUsernames}
                    linkStyle={textStyles.link}
                    messageData={messageData}
                    textStyles={textStyles}
                    theme={theme}
                />
            );
        } else if (isEmojiOnly) {
            messageComponent = (
                <MarkdownEmoji
                    baseTextStyle={messageStyle}
                    isEdited={hasBeenEdited}
                    shouldRenderJumboEmoji={shouldRenderJumboEmoji}
                    value={message}
                />
            );
        } else if (message.length) {
            messageComponent = (
                <View
                    style={[style.messageContainer, (isReplyPost && style.reply), (isPendingOrFailedPost && style.pendingPost)]}
                    onLayout={this.measurePost}
                    removeClippedSubviews={isLongPost}
                >
                    <Markdown
                        baseTextStyle={messageStyle}
                        blockStyles={blockStyles}
                        channelMentions={postProps.channel_mentions}
                        imagesMetadata={metadata?.images}
                        isEdited={hasBeenEdited}
                        isReplyPost={isReplyPost}
                        isSearchResult={isSearchResult}
                        onHashtagPress={onHashtagPress}
                        onPermalinkPress={onPermalinkPress}
                        onPostPress={onPress}
                        textStyles={textStyles}
                        value={message}
                        disableAtChannelMentionHighlight={postProps.mentionHighlightDisabled}
                    />
                </View>
            );
        }

        if (!hasBeenDeleted) {
            body = (
                <View style={style.messageBody}>
                    <ScrollView
                        style={{maxHeight: (showLongPost ? null : maxHeight), overflow: 'hidden'}}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps={'always'}
                    >
                        {messageComponent}
                    </ScrollView>
                    {isLongPost &&
                    <ShowMoreButton
                        highlight={highlight}
                        onPress={this.openLongPost}
                        theme={theme}
                    />
                    }
                    {this.renderPostAdditionalContent(blockStyles, messageStyle, textStyles)}
                    {this.renderFileAttachments()}
                    {this.renderReactions()}
                    {!isSearchResult && this.renderReply()}
                </View>
            );
        }

        return (
            <View style={style.messageContainerWithReplyBar}>
                <View style={replyBarStyle}/>
                {body}
                {isFailed &&
                <TouchableWithFeedback
                    onPress={onFailedPostPress}
                    style={style.retry}
                    type={'opacity'}
                >
                    <Icon
                        name='ios-information-circle-outline'
                        size={26}
                        color={theme.errorTextColor}
                    />
                </TouchableWithFeedback>
                }
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        messageBody: {
            paddingBottom: 2,
            paddingTop: 2,
            flex: 1,
        },
        messageContainer: {
            width: '100%',
        },
        reply: {
            paddingRight: 10,
        },
        retry: {
            justifyContent: 'center',
            marginLeft: 10,
        },
        message: {
            color: theme.centerChannelColor,
            fontSize: 15,
            lineHeight: 20,
        },
        messageContainerWithReplyBar: {
            flexDirection: 'row',
            width: '100%',
        },
        pendingPost: {
            opacity: 0.5,
        },
        systemMessage: {
            opacity: 0.6,
        },
        replyWrapper: {
            flex: 1,
            justifyContent: 'flex-start',
        },
        replyIconContainer: {
            minWidth: 40,
            paddingTop: 2,
            paddingBottom: 10,
            flex: 2,
            flexDirection: 'row',
            justifyContent: 'flex-start',
        },
        replyText: {
            fontSize: 12,
            marginLeft: 2,
            marginTop: 2,
            color: theme.linkColor,
        },
        lastReplyAt: {
            color: theme.centerChannelColor,
            fontSize: 11,
            marginTop: 2.8,
            opacity: 0.5,
            marginLeft: 4,
        },
        lastReplyDate: {
            color: theme.centerChannelColor,
            fontSize: 11,
            marginTop: 2.8,
            opacity: 0.5,
        },
        lastReplyTime: {
            color: theme.centerChannelColor,
            fontSize: 11,
            marginTop: 2.8,
            opacity: 0.5,
            marginLeft: 3,
        },
    };
});
