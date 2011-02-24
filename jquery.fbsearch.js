(function($) {
  function FBSearch(options) {
    if (options) {
      this.busyOptions = $.extend({}, FBSearch.busyDefaults, options.busy || {});
      this.autocompleteOptions = $.extend({}, FBSearch.autocompleteDefaults, options.autocomplete || {});

      delete options.busy;
      delete options.autocomplete;
    }
    else {
      this.busyOptions = FBSearch.busyDefaults;
      this.autocompleteOptions = FBSearch.autocompleteDefaults;
    }
    
    this.options = $.extend({}, FBSearch.defaults, options || {});
  }

  FBSearch.prototype.checkLibraries = function() {
    this.busyLoaded = ($().busy) ? true : false; // czy można używać jquery-busy 
    
    if ($().autocomplete == "undefined") {
      console.log("FB Search: jQuery UI Autocomplete is required!");
      return false;
    }

    if (typeof FB == "undefined") {
      console.log("FB Search: Facebook API is required!");
      return false;
    }

    return true;
  }

  FBSearch.prototype.checkAndWrapNode = function(node) {
    if (typeof node == "string") { // wprowadzono selektor zamiast obiektu jQuery()
      return $(node);
    }
    else if (typeof node == "object") { // zbiór elementów jako obiekt jQuery()
      return node;
    }
    return $(false);
  }

  FBSearch.prototype.prepareNodes = function() {
    this.options.facebook_id = this.checkAndWrapNode(this.options.facebook_id);
    this.options.url = this.checkAndWrapNode(this.options.url);
    this.options.name = this.checkAndWrapNode(this.options.name);
    this.options.image_url = this.checkAndWrapNode(this.options.image_url);
    this.options.likes = this.checkAndWrapNode(this.options.likes);
    this.options.category = this.checkAndWrapNode(this.options.category);
    this.options.icon = this.checkAndWrapNode(this.options.icon);
    this.options.image = this.checkAndWrapNode(this.options.image);
    this.options.link = this.checkAndWrapNode(this.options.link);

    this.busyOptions.image = this.checkAndWrapNode(this.busyOptions.image);
    this.busyElement = (this.busyOptions.image.length == 0) ? this.options.icon : this.busyOptions.image;

    if (this.options.prefix) {
      var prefix = this.options.prefix;

      if (this.options.facebook_id.length == 0)
        this.options.facebook_id = $("#" + prefix + "_facebook_id");
      if (this.options.url.length == 0)
        this.options.url = $("#" + prefix + "_url");
      if (this.options.name.length == 0)
        this.options.name = $("#" + prefix + "_name");
      if (this.options.image_url.length == 0)
        this.options.image_url = $("#" + prefix + "_image_url");
      if (this.options.likes.length == 0)
        this.options.likes = $("#" + prefix + "_likes");
      if (this.options.category.length == 0)
        this.options.category = $("#" + prefix + "_category");
      if (this.options.image.length == 0)
        this.options.image = $("#" + prefix + "_image");
      if (this.options.link.length == 0)
        this.options.link = $("#" + prefix + "_link");
      if (this.options.icon.length == 0)
        this.options.icon = $("#" + prefix + "_icon");

      if (this.options.image.length == 0)
        this.options.image = this.options.icon;
      if (this.busyElement.length == 0)
        this.busyElement = this.options.image;
    }

    return true;
  }

  FBSearch.prototype.busy = function(options) {
    if (this.busyLoaded && this.busyElement)
      return this.busyElement.busy(options);
  }

  FBSearch.prototype.setFBIcon = function() {
    if (this.options.icon && this.options.img)
      return this.options.icon.attr("src", this.options.img);
  }

  FBSearch.prototype.changeState = function(state) {
    $.data(this.input[0], "fb-search-state", state);
  }

  FBSearch.prototype.init = function($input) {
    if (this.checkLibraries()) {
      this.input = $($input[0]); // input, na którym wywołano FBSearch.
      this.prepareNodes();

      if (this.options.start_with_icon)
        this.setFBIcon();

      this.search();
    }
  }

  FBSearch.prototype.cancel = function(input, bool) {
    if (typeof bool == "undefined")
      $.data(input, "fb-search-cancel", true);
    else
      $.data(input, "fb-search-cancel", bool);

    if (bool)
      this.busy("remove");
  }

  FBSearch.prototype.isCancelled = function() {
    if ($.data(this.input[0], "fb-search-cancel") === true) {
      this.busy("remove");
      return true;
    }
    return false;
  }

  FBSearch.prototype.search = function() {
    this.cancel(this.input[0], false);

    var cache = {},
        lastTerm,
        requestCounter = 0,
        that = this,
        input = that.input[0];

    var autocompleteCustomFunctions = {
      select : that.autocompleteOptions.select,
      search : that.autocompleteOptions.search,
      change : that.autocompleteOptions.change,
      focus : that.autocompleteOptions.focus,
      open : that.autocompleteOptions.open,
      close : that.autocompleteOptions.close
    };

    if (that.autocompleteOptions) {
      delete that.autocompleteOptions.select;
      delete that.autocompleteOptions.search;
      delete that.autocompleteOptions.change;
      delete that.autocompleteOptions.focus;
      delete that.autocompleteOptions.open;
      delete that.autocompleteOptions.close;
      delete that.autocompleteOptions.source;
    }

    var autocompleteSettings = {
      select : function(event, ui) {
        that.changeState("select");

        if (ui.item.error)
          return false;

        that.options.link.css("display", "").removeClass("hidden").attr('href', ui.item.link);
        that.options.facebook_id.val(ui.item.id);

        if (that.options.result == "url" || that.input != that.options.url)
          that.options.url.val(ui.item.link);

        that.options.name.val(ui.item.name);
        that.options.image_url.val(ui.item.picture);
        that.options.likes.val(ui.item.likes);
        that.options.category.val(ui.item.category);

        if (that.options.image != that.options.icon)
          that.setFBIcon();

        that.options.image.attr('src', ui.item.picture);

        // temporarily it has to be a fanpage.
        $.data(input, {
          "fb-search-facebook_id" : ui.item.id,
          "fb-search-url" : ui.item.link,
          "fb-search-name" : ui.item.name,
          "fb-search-image_url" : ui.item.picture,
          "fb-search-likes" : ui.item.likes,
          "fb-search-category" : ui.item.category
        });

        if (that.options.result == "url")
          that.input.val(ui.item.link);
        else if (that.options.result == "name")
          that.input.val(ui.item.name);

        that.busy("remove");

        if (autocompleteCustomFunctions && autocompleteCustomFunctions.select)
          return autocompleteCustomFunctions.select.call(this, event, ui);

        return false;
      },

      search : function(event, ui) {
        that.changeState("search");
        that.setFBIcon();
        that.busy(that.busyOptions);

        if (that.options.link.is(":visible"))
          that.options.link.css("display", "none").addClass("hidden");

        if (autocompleteCustomFunctions && autocompleteCustomFunctions.search)
          return autocompleteCustomFunctions.search.call(this, event, ui);

        return true;
      },

      change : function(event, ui) {
        that.changeState("change");
        that.busy("remove");

        if (autocompleteCustomFunctions && autocompleteCustomFunctions.change)
          return autocompleteCustomFunctions.change.call(this, event, ui);

        return true;
      },

      focus : function(event, ui) {
        that.changeState("focus");

        if (ui.item.error)
          return false;

        if (autocompleteCustomFunctions && autocompleteCustomFunctions.focus)
          return autocompleteCustomFunctions.focus.call(this, event, ui);

        return false;
      },

      open : function(event) {
        that.changeState("open");
        that.busy("remove");
      },

      close : function(event) {
        that.changeState("close");
        that.busy("remove");

        if (autocompleteCustomFunctions && autocompleteCustomFunctions.close)
          autocompleteCustomFunctions.close.call(this, event);
      },

      source : function(request, callback) {
        if (request.term == lastTerm)
          return;

        if (cache[request.term]) {
          callback(cache[request.term]);
          return;
        }

        // URL entered
        if (request.term.match(/^https?:\/\//)) {
          that.busy(that.busyOptions);
          
          try {
            if (that.options.type == "page") {
              var matchData = request.term.match(/^https?\:\/\/(www\.)?facebook\.com\/(.+\/)*(.+)$/);
              var matchedId = matchData[3];
            }
          } catch(error) { console.log(error); }


          if (matchedId) {
            FB.api("/", { 'ids' : matchedId }, function(response) {
              if (! that.isCancelled()) {
                if (response["error"]) {
                  var message = that.autocompleteOptions._renderNotFoundURLMessage(request);
                  var results = [{ name: message, error: true }];
                }
                else {
                  var results = [response[matchedId]];
                }
          
                cache[request.term] = results;
                callback(results);
                requestCounter--;
                if (requestCounter <= 0)
                  that.busy("remove");
              }
              else {
                requestCounter = 0;                
                that.busy("remove");
              } 
            });

            return;
          }
        }

        // Keyword search
        if (! that.isCancelled()) {
          that.busy(that.busyOptions);

          requestCounter++;
          FB.api("/search", { q : request.term, type : that.options.type, limit : that.options.limit }, function(response) {
            if (response.error || response.data.length == 0) {
              var message = that.autocompleteOptions._renderNotFoundKeywordMessage(request);

              callback([{ name: message, error: true }]);
              requestCounter--;
              if (requestCounter <= 0)
                that.busy("remove");

              return;
            }

            var ids = [];
            for (var i = 0; i < response.data.length; i++)
              ids.push(response.data[i].id);
          
            if (! that.isCancelled()) {
              FB.api("/", { 'ids' : ids.join(',') }, function(response) {
                var results = [];
                for (var i = 0; i < ids.length; i++)
                  results.push(response[ids[i]]);
          
                if (! that.isCancelled()) {
                  cache[request.term] = results;
                  callback(results);
                  requestCounter--;
                  if (requestCounter <= 0)
                    that.busy("remove");
            
                }
                else {
                  requestCounter = 0;
                  that.busy("remove");
                } 
              });
            }
            else {
              requestCounter = 0;
              that.busy("remove");
            }
          });
        }
      }
    }

    var autocomplete = this.input.autocomplete($.extend(autocompleteSettings, that.autocompleteOptions));
    autocomplete.data("autocomplete")._renderItem = that.autocompleteOptions._renderItem;
  }

  FBSearch._renderItem = function(ul, item) {
    var itemHtml = jQuery("<a></a>");

    if (item.picture)
      itemHtml.append("<div class='image-container'><img src='" + item.picture + "' width='32' alt='' /></div>");

    if (item.likes)
      itemHtml.append("<div><p class='name'>" + item.name + "</p><p class='likes'>" + item.likes + " likes</p></div>");
    else
      itemHtml.append("<div><p class='name'>" + item.name + "</p></div>");

    return jQuery("<li class='" + (item.error ? "error" : "") + "'></li>")
      .data("item.autocomplete", item)
      .append(itemHtml)
      .appendTo(ul);
  };

  FBSearch._renderNotFoundKeywordMessage = function(request) {
    return "We haven’t found any fanpage reffering to „" + request.term + "”. Try again with different name or enter fanpage url, eg. http://www.facebook.com/pages/Fanpage-name/10150091515480375";
  }

  FBSearch._renderNotFoundURLMessage = function(request) {
    return "Sorry, the URL you entered does not appear to be a facebook page.";
  }

  FBSearch.defaults = {
    img : '/facebook-search-icon.png',
    result : "name",
    icon : false, // fb icon
    start_with_icon : false, // czy na początku ustawić ikonkę fb
    image : false, // fanpage image
    facebook_id : false,
    url : false,
    name : false,
    image_url : false,
    link : false,
    type : "page",
    limit : 10,
    prefix : false
  }

  FBSearch.autocompleteDefaults = {
    minLength : 1,
    delay : 100,
    type : "page",
    _renderItem : FBSearch._renderItem,
    _renderNotFoundKeywordMessage : FBSearch._renderNotFoundKeywordMessage,
    _renderNotFoundURLMessage : FBSearch._renderNotFoundURLMessage
  }

  FBSearch.busyDefaults = {
    position : "center",
    img : "/busy-facebook-search.gif",
    image : false
  }

  $.fn.fbsearch = function(options, defaults) {
    if ($.inArray(options, ["name", "url", "likes", "category", "facebook_id", "image_url", "state"]) != -1) {
      return $.data($(this)[0], "fb-search-" + options);
    }
    else if (options == "defaults") {
      $.extend(FBSearch.defaults, defaults || {});
      return $();
    }
    else if (options == "autocomplete-defaults") {
      $.extend(FBSearch.autocompleteDefaults, defaults || {});
      return $();
    }
    else if (options == "busy-defaults") {
      $.extend(FBSearch.busyDefaults, defaults || {});
      return $();
    }
    else if (options == "cancel") {
      new FBSearch().cancel(this);
      return $(this);
    }
    else {
      new FBSearch(options).init($(this));
      return $(this);
    }
  };
})(jQuery);
