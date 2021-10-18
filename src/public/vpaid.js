/**
 * @fileoverview A VPAID ad useful for testing functionality of the sdk.
 * This particular ad will just play a video.
 *
 * @author ryanthompson@google.com (Ryan Thompson)
 */

/**
 * @constructor
 */
var VpaidVideoPlayer = function () {
  /**
   * The slot is the div element on the main page that the ad is supposed to
   * occupy.
   * @type {Object}
   * @private
   */
  this.slot_ = null;

  /**
   * The video slot is the video element used by the ad to render video content.
   * @type {Object}
   * @private
   */
  this.videoSlot_ = null;
  this.videoelementAd_ = null;
  this.videoelement_ = null;
  this.isAnimating_ = false;
  this.ad = false;
  this.logo_ = null;

  /**
   * An object containing all registered events.  These events are all
   * callbacks for use by the VPAID ad.
   * @type {Object}
   * @private
   */
  this.eventsCallbacks_ = {};

  /**
   * A list of getable and setable attributes.
   * @type {Object}
   * @private
   */
  this.attributes_ = {
    companions: "",
    desiredBitrate: 256,
    duration: 30,
    expanded: false,
    height: 0,
    icons: false,
    linear: true,
    remainingTime: 13,
    skippableState: false,
    viewMode: "normal",
    width: 0,
    volume: 1.0
  };

  /**
   * @type {?number} id of the interval used to synch remaining time
   * @private
   */
  this.intervalId_ = null;

  /**
   * A set of events to be reported.
   * @type {Object}
   * @private
   */
  this.quartileEvents_ = [
    { event: "AdImpression", value: 0 },
    { event: "AdVideoStart", value: 0 },
    { event: "AdVideoFirstQuartile", value: 25 },
    { event: "AdVideoMidpoint", value: 50 },
    { event: "AdVideoThirdQuartile", value: 75 },
    { event: "AdVideoComplete", value: 100 }
  ];

  /**
   * @type {number} An index into what quartile was last reported.
   * @private
   */
  this.lastQuartileIndex_ = 0;

  /**
   * An array of urls and mimetype pairs.
   *
   * @type {!object}
   * @private
   */
  this.parameters_ = {};
};

/**
 * VPAID defined init ad, initializes all attributes in the ad.  The ad will
 * not start until startAd is called.
 *
 * @param {number} width The ad width.
 * @param {number} height The ad heigth.
 * @param {string} viewMode The ad view mode.
 * @param {number} desiredBitrate The desired bitrate.
 * @param {Object} creativeData Data associated with the creative.
 * @param {Object} environmentVars Variables associated with the creative like
 *     the slot and video slot.
 */
VpaidVideoPlayer.prototype.initAd = function (
  width,
  height,
  viewMode,
  desiredBitrate,
  creativeData,
  environmentVars
) {
  // slot and videoSlot are passed as part of the environmentVars
  this.attributes_["width"] = width;
  this.attributes_["height"] = height;
  this.attributes_["viewMode"] = viewMode;
  this.attributes_["desiredBitrate"] = desiredBitrate;
  this.slot_ = environmentVars.slot;
  this.videoSlot_ = environmentVars.videoSlot;
  this.videoAdSlot_ = environmentVars.videoSlot;

  // Parse the incoming parameters.
  this.parameters_ = JSON.parse(creativeData["AdParameters"]);
  this.log(
    "initAd " + width + "x" + height + " " + viewMode + " " + desiredBitrate
  );
  this.updateVideoSlot_();
  this.videoSlot_.addEventListener(
    "timeupdate",
    this.timeUpdateHandler_.bind(this),
    false
  );
  this.videoSlot_.addEventListener("ended", this.stopAd.bind(this), false);
  this.videoSlot_.addEventListener("play", this.videoResume_.bind(this), false);
  this.callEvent_("AdLoaded");
};

/**
 * Called when the overlay is clicked.
 * @private
 */
VpaidVideoPlayer.prototype.overlayOnClick_ = function () {
  if ("AdClickThru" in this.eventsCallbacks_) {
    this.eventsCallbacks_["AdClickThru"]("", "0", true);
  }
};

/**
 * Called by the video element.  Calls events as the video reaches times.
 * @private
 */
VpaidVideoPlayer.prototype.timeUpdateHandler_ = function () {
  this.attributes_["remainingTime"] =
    this.videoSlot_.duration - this.videoSlot_.currentTime;
  if (this.lastQuartileIndex_ >= this.quartileEvents_.length) {
    return;
  }
  var percentPlayed =
    (this.videoSlot_.currentTime * 100.0) / this.videoSlot_.duration;
  if (percentPlayed >= this.quartileEvents_[this.lastQuartileIndex_].value) {
    var lastQuartileEvent = this.quartileEvents_[this.lastQuartileIndex_].event;
    this.eventsCallbacks_[lastQuartileEvent]();
    this.lastQuartileIndex_ += 1;
  }
  if (this.attributes_["duration"] != this.videoSlot_.duration) {
    this.attributes_["duration"] = this.videoSlot_.duration;
    this.callEvent_("AdDurationChange");
  }
  var mainAtt = this.attributes_;
  var mThis = this;
  // console.log(
  //   "timeupdate",
  //   Math.round(this.videoSlot_.currentTime),
  //   this.isAnimating_
  // );
  if (
    !this.isAnimating_ &&
    Math.round(this.videoSlot_.currentTime) > 0 &&
    Math.round(this.videoSlot_.currentTime) % 15 === 0
  ) {
    this.isAnimating_ = true;
    if (mThis.ad) {
      this.videoelementAd_.style.height = mainAtt["height"] + "px";
      this.videoelement_.pause();
      mThis.ad = false;
    } else {
      if (Math.round(this.videoSlot_.currentTime) % 30 === 0) {
        mThis.ad = true;
        this.videoelement_.src =
          "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

        this.videoelement_.play();
        this.videoelementAd_.style.height =
          (mainAtt["height"] * 25) / 100 + "px";
        this.videoelementAd_.style["border-style"] = "solid";
        this.videoelementAd_.style["border-width"] = "1px";
        this.videoelementAd_.style["border-color"] = "white";
        mThis.logo_.style.display = "none";
      }
    }
    setTimeout(function () {
      mThis.isAnimating_ = false;
      if (!mThis.ad) mThis.logo_.style.display = "block";
    }, 1000);
  }
};

/**
 * @private
 */
VpaidVideoPlayer.prototype.updateVideoSlot_ = function () {
  if (this.videoSlot_ == null) {
    this.videoSlot_ = document.createElement("video");
    this.log("Warning: No video element passed to ad, creating element.");
    this.slot_.appendChild(this.videoSlot_);
  }
  // TODO right now the sdk is sending in the wrong size on init.
  // there should be no need to change element sizes from the start.
  //this.updateVideoPlayerSize_();
  var foundSource = false;
  var videos = this.parameters_.videos || [];
  for (var i = 0; i < videos.length; i++) {
    // Choose the first video with a supported mimetype.
    if (this.videoSlot_.canPlayType(videos[i].mimetype) != "") {
      this.videoSlot_.setAttribute("src", videos[i].url);
      foundSource = true;
      break;
    }
  }

  if (!foundSource) {
    // Unable to find a source video.
    this.callEvent_("AdError");
  }
};

/**
 * Helper function to update the size of the video player.
 * @private
 */
VpaidVideoPlayer.prototype.updateVideoPlayerSize_ = function () {
  console.log("size");
  try {
    this.videoSlot_.setAttribute("width", this.attributes_["width"]);
    this.videoSlot_.setAttribute("height", this.attributes_["height"]);
    this.videoSlot_.style.width = this.attributes_["width"] + "px";
    this.videoSlot_.style.height = this.attributes_["height"] + "px";
  } catch (e) {
    /* no op*/
  }
};

/**
 * Returns the versions of VPAID ad supported.
 * @param {string} version
 * @return {string}
 */
VpaidVideoPlayer.prototype.handshakeVersion = function (version) {
  return "2.0";
};

/**
 * Called by the wrapper to start the ad.
 */
VpaidVideoPlayer.prototype.startAd = function () {
  this.log("Starting ad");
  this.videoSlot_.play();
  var img = document.createElement("img");
  img.src = this.parameters_.overlay || "";
  // this.slot_.appendChild(img);
  img.addEventListener("click", this.overlayOnClick_.bind(this), false);

  //add a test mute button
  var muteButton = document.createElement("input");
  muteButton.setAttribute("type", "button");
  muteButton.setAttribute("value", "mute/unMute");

  muteButton.addEventListener(
    "click",
    this.muteButtonOnClick_.bind(this),
    false
  );
  // this.slot_.appendChild(muteButton);

  this.callEvent_("AdStarted");

  // var videoelement = document.createElement("video");
  // videoelement.setAttribute("id", "video1");
  // videoelement.setAttribute("muted", true);
  // videoelement.style.height = "100px";

  // var sourceMP4 = document.createElement("source");
  // sourceMP4.type = "video/mp4";
  // sourceMP4.src =
  //   "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
  // videoelement.appendChild(sourceMP4);
  // videoelement.play();

  // this.slot_.appendChild(videoelement);

  // document.getElementById("video_player").innerHTML = video_tags;
  var tag_parent = document.createElement("div");
  // var tag_parent = document.getElementById("video_tags");
  tag_parent.style.position = "relative";
  tag_parent.style.width = this.attributes_["width"] + "px";
  tag_parent.style.height = this.attributes_["height"] + "px";

  var videoelement = document.createElement("video");
  videoelement.setAttribute("id", "video1");
  videoelement.setAttribute("muted", true);
  videoelement.style.height = this.attributes_["height"] + "px";
  // videoelement.style.padding = "10px";
  videoelement.style.position = "absolute";
  // videoelement.style["border-style"] = "solid";
  // videoelement.style["border-width"] = "1px";

  var sourceMP4 = document.createElement("source");
  sourceMP4.type = "video/mp4";
  sourceMP4.src =
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
  videoelement.appendChild(sourceMP4);
  tag_parent.appendChild(videoelement);

  videoelement.muted = true;
  var videoelementAd = document.createElement("video");
  videoelementAd.setAttribute("id", "video_ad");
  videoelementAd.style.position = "absolute";
  videoelementAd.style.height = this.attributes_["height"] + "px";
  // videoelementAd.style.height = "100px";
  videoelementAd.style["border-style"] = "solid";
  videoelementAd.style["border-width"] = "1px";
  videoelementAd.style.bottom = 0;
  videoelementAd.style.left = 0;
  videoelementAd.style["transition"] = "height 1000ms ease-in-out";
  // videoelementAd.style.height = "100px";
  // videoelementAd.style.padding = "10px";

  // videoelementAd.style["margin-top"] = "395px";
  // videoelementAd.style["margin-left"] = "5px";
  // videoelementAd.style["border-style"] = "solid";
  // videoelementAd.style["border-width"] = "2px";
  // videoelementAd.style["border-color"] = "white";

  var sourceMP4Ad = document.createElement("source");
  sourceMP4Ad.type = "video/mp4";
  sourceMP4Ad.src =
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
  videoelementAd.appendChild(sourceMP4Ad);
  tag_parent.appendChild(videoelementAd);

  videoelementAd.play();

  var logo = document.createElement("img");
  logo.src = "https://ghmoo.sse.codesandbox.io/static/infysticker.png";
  logo.style.position = "absolute";
  logo.style.height = "50px";
  logo.style.bottom = 0;
  logo.style.right = "5px";
  logo.style.opacity = "0.8";
  this.logo_ = logo;
  tag_parent.appendChild(logo);

  this.slot_.appendChild(tag_parent);
  this.videoelementAd_ = videoelementAd;
  this.videoelement_ = videoelement;
};

/**
 * Called by the wrapper to stop the ad.
 */
VpaidVideoPlayer.prototype.stopAd = function () {
  this.log("Stopping ad");
  if (this.intervalId_) {
    clearInterval(this.intervalId_);
  }
  // Calling AdStopped immediately terminates the ad. Setting a timeout allows
  // events to go through.
  var callback = this.callEvent_.bind(this);
  setTimeout(callback, 75, ["AdStopped"]);
};

/**
 * @param {number} value The volume in percentage.
 */
VpaidVideoPlayer.prototype.setAdVolume = function (value) {
  this.attributes_["volume"] = value;
  this.log("setAdVolume " + value);
  this.videoSlot_.volume = value / 100.0;
  this.callEvent_("AdVolumeChange");
};

/**
 * @return {number} The volume of the ad.
 */
VpaidVideoPlayer.prototype.getAdVolume = function () {
  this.log("getAdVolume");
  return this.attributes_["volume"];
};

/**
 * @param {number} width The new width.
 * @param {number} height A new height.
 * @param {string} viewMode A new view mode.
 */
VpaidVideoPlayer.prototype.resizeAd = function (width, height, viewMode) {
  this.log("resizeAd " + width + "x" + height + " " + viewMode);
  this.attributes_["width"] = width;
  this.attributes_["height"] = height;
  this.attributes_["viewMode"] = viewMode;
  this.updateVideoPlayerSize_();
  this.callEvent_("AdSizeChange");
};

/**
 * Pauses the ad.
 */
VpaidVideoPlayer.prototype.pauseAd = function () {
  this.log("pauseAd");
  this.videoSlot_.pause();
  this.callEvent_("AdPaused");
  if (this.intervalId_) {
    clearInterval(this.intervalId_);
  }
};

/**
 * Resumes the ad.
 */
VpaidVideoPlayer.prototype.resumeAd = function () {
  this.log("resumeAd");
  this.videoSlot_.play();
  this.callEvent_("AdPlaying");
  var callback = function () {
    this.attributes_["remainingTime"] -= 0.25;
    this.callEvent_("AdRemainingTimeChange");
  }.bind(this);
  this.intervalId_ = setInterval(callback, 250);
};

/**
 * Expands the ad.
 */
VpaidVideoPlayer.prototype.expandAd = function () {
  this.log("expandAd");
  this.attributes_["expanded"] = true;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  }
  this.callEvent_("AdExpanded");
};

/**
 * Returns true if the ad is expanded.
 * @return {boolean}
 */
VpaidVideoPlayer.prototype.getAdExpanded = function () {
  this.log("getAdExpanded");
  return this.attributes_["expanded"];
};

/**
 * Returns the skippable state of the ad.
 * @return {boolean}
 */
VpaidVideoPlayer.prototype.getAdSkippableState = function () {
  this.log("getAdSkippableState");
  return this.attributes_["skippableState"];
};

/**
 * Collapses the ad.
 */
VpaidVideoPlayer.prototype.collapseAd = function () {
  this.log("collapseAd");
  this.attributes_["expanded"] = false;
};

/**
 * Skips the ad.
 */
VpaidVideoPlayer.prototype.skipAd = function () {
  this.log("skipAd");
  var skippableState = this.attributes_["skippableState"];
  if (skippableState) {
    this.callEvent_("AdSkipped");
  }
};

/**
 * Registers a callback for an event.
 * @param {Function} aCallback The callback function.
 * @param {string} eventName The callback type.
 * @param {Object} aContext The context for the callback.
 */
VpaidVideoPlayer.prototype.subscribe = function (
  aCallback,
  eventName,
  aContext
) {
  this.log("Subscribe " + aCallback);
  var callBack = aCallback.bind(aContext);
  this.eventsCallbacks_[eventName] = callBack;
};

/**
 * Removes a callback based on the eventName.
 *
 * @param {string} eventName The callback type.
 */
VpaidVideoPlayer.prototype.unsubscribe = function (eventName) {
  this.log("unsubscribe " + eventName);
  this.eventsCallbacks_[eventName] = null;
};

/**
 * @return {number} The ad width.
 */
VpaidVideoPlayer.prototype.getAdWidth = function () {
  return this.attributes_["width"];
};

/**
 * @return {number} The ad height.
 */
VpaidVideoPlayer.prototype.getAdHeight = function () {
  return this.attributes_["height"];
};

/**
 * @return {number} The time remaining in the ad.
 */
VpaidVideoPlayer.prototype.getAdRemainingTime = function () {
  return this.attributes_["remainingTime"];
};

/**
 * @return {number} The duration of the ad.
 */
VpaidVideoPlayer.prototype.getAdDuration = function () {
  return this.attributes_["duration"];
};

/**
 * @return {string} List of companions in vast xml.
 */
VpaidVideoPlayer.prototype.getAdCompanions = function () {
  return this.attributes_["companions"];
};

/**
 * @return {boolean} A list of icons.
 */
VpaidVideoPlayer.prototype.getAdIcons = function () {
  return this.attributes_["icons"];
};

/**
 * @return {boolean} True if the ad is a linear, false for non linear.
 */
VpaidVideoPlayer.prototype.getAdLinear = function () {
  return this.attributes_["linear"];
};

/**
 * Logs events and messages.
 *
 * @param {string} message
 */
VpaidVideoPlayer.prototype.log = function (message) {
  console.log(message);
};

/**
 * Calls an event if there is a callback.
 * @param {string} eventType
 * @private
 */
VpaidVideoPlayer.prototype.callEvent_ = function (eventType) {
  if (eventType in this.eventsCallbacks_) {
    this.eventsCallbacks_[eventType]();
  }
};

/**
 * Callback for when the mute button is clicked.
 * @private
 */
VpaidVideoPlayer.prototype.muteButtonOnClick_ = function () {
  if (this.attributes_["volume"] == 0) {
    this.attributes_["volume"] = 1.0;
    this.videoSlot_.volume = 1.0;
  } else {
    this.attributes_["volume"] = 0.0;
    this.videoSlot_.volume = 0.0;
  }
  this.callEvent_("AdVolumeChange");
};

/**
 * Callback when the video element calls start.
 * @private
 */
VpaidVideoPlayer.prototype.videoResume_ = function () {
  this.log("video element resumed.");
};

/**
 * Main function called by wrapper to get the VPAID ad.
 * @return {Object} The VPAID compliant ad.
 */
var getVPAIDAd = function () {
  return new VpaidVideoPlayer();
};
