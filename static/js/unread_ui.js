var render_bankruptcy_modal = require('../templates/bankruptcy_modal.hbs');

var last_mention_count = 0;

function do_new_messages_animation(li) {
    li.addClass("new_messages");
    function mid_animation() {
        li.removeClass("new_messages");
        li.addClass("new_messages_fadeout");
    }
    function end_animation() {
        li.removeClass("new_messages_fadeout");
    }
    setTimeout(mid_animation, 3000);
    setTimeout(end_animation, 6000);
}

exports.animate_mention_changes = function (li, new_mention_count) {
    if (new_mention_count > last_mention_count) {
        do_new_messages_animation(li);
    }
    last_mention_count = new_mention_count;
};

exports.set_count_toggle_button = function (elem, count) {
    if (count === 0) {
        if (elem.is(':animated')) {
            return elem.stop(true, true).hide();
        }
        return elem.hide(500);
    } else if (count > 0 && count < 1000) {
        elem.show(500);
        return elem.text(count);
    }
    elem.show(500);
    return elem.text("1k+");
};

exports.update_unread_counts = function () {
    if (unread.suppress_unread_counts) {
        return;
    }

    // Pure computation:
    var res = unread.get_counts();

    // Side effects from here down:
    // This updates some DOM elements directly, so try to
    // avoid excessive calls to this.
    activity.update_dom_with_unread_counts(res);
    top_left_corner.update_dom_with_unread_counts(res);
    stream_list.update_dom_with_unread_counts(res);
    pm_list.update_dom_with_unread_counts(res);
    notifications.update_pm_count(res.private_message_count);
    var notifiable_unread_count = unread.calculate_notifiable_count(res);
    notifications.update_title_count(notifiable_unread_count);

    exports.set_count_toggle_button($("#streamlist-toggle-unreadcount"),
                                    res.home_unread_messages);

};

exports.enable = function enable() {
    unread.set_suppress_unread_counts(false);
    exports.update_unread_counts();
};

function consider_bankruptcy() {
    // Until we've handled possibly declaring bankruptcy, don't show
    // unread counts since they only consider messages that are loaded
    // client side and may be different from the numbers reported by
    // the server.

    if (!page_params.furthest_read_time) {
        // We've never read a message.
        exports.enable();
        return;
    }

    var now = new XDate(true).getTime() / 1000;
    if (page_params.unread_msgs.count > 500 &&
            now - page_params.furthest_read_time > 60 * 60 * 24 * 2) { // 2 days.
        var rendered_modal = render_bankruptcy_modal({
            unread_count: page_params.unread_msgs.count});
        $('#bankruptcy-unread-count').html(rendered_modal);
        $('#bankruptcy').modal('show');
    } else {
        exports.enable();
    }
}

exports.initialize = function () {
    // No matter how the bankruptcy modal is closed, show unread counts after.
    $("#bankruptcy").on("hide", function () {
        exports.enable();
    });

    $('#yes-bankrupt').click(function () {
        pointer.fast_forward_pointer();
        $("#yes-bankrupt").hide();
        $("#no-bankrupt").hide();
        $('#bankruptcy-loader').css('margin', '0 auto');
        loading.make_indicator($('#bankruptcy-loader'),
                               {text: i18n.t('Marking all messages as read…')});
    });

    consider_bankruptcy();
};

window.unread_ui = exports;
