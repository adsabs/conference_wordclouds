

_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

  var WordCloudView = Marionette.ItemView.extend({

        className: "s-wordcloud-widget",

        initialize: function (options) {

          options = options || {};

          this.listenTo(this.model, "change:processedWordList", this.buildCloudLayout);

        },

        toggleHighlight : function(word){

          var w = word.trim();
          d3.selectAll(this.$("text")).filter(function(){
            if (this.textContent.trim() == w) {
              var d3This =  d3.select(this);
             d3This.classed("selected", !d3This.classed("selected"));
            }
          });
        },


        render: function() {

          var template =   _.template($("#wordcloud-template").html());

          this.$el.html(template(this.model.toJSON()));

          this.buildSlider();

          this.buildCloudLayout();

          return this
        },


        buildCloudLayout : function(){

          d3.layout.cloud()
            .size([1000, 600])
            .words(this.model.get("processedWordList"))
            .padding(3)
            .rotate(function() { return 0})
            .font("Arial")
            .fontSize(function(d) { return d.size; })
            .on("end", _.bind(this.draw, this))
            .start();

        },

        buildSlider: function () {

          var that = this;

          this.$("#word-choice").slider({
            value: that.model.get("currentSliderVal"),
            min  : 1,
            max  : 5,
            step : 1,
            slide: function (event, ui) {
              that.model.set({currentSliderVal: ui.value})
            }
          })
        },


        draw: function () {

          var that = this;

          var renderVals = this.model.get("renderVals");
          var height = 600;
          var width = 1000;

          var svg = d3.select(this.$(".wordcloud-svg")[0]);

          var words = this.model.get("processedWordList");

          //set up code, only runs the first time

          if (!this.$("#words-group").length){
           var g = svg
              .append("g")
              .attr('id', 'words-group')
              .attr("width", width)
              .attr("height", height)
              .attr("transform", function()
              {
                return "translate(" + width/2 + " " + height/2 + ")"
              });

            //using event delegation for click events
            //this seems to reduce time spent rendering
            svg[0][0].addEventListener("click", function(e){

              if (e.target.tagName === "text"){

              var word = e.target.textContent;

              window.location.href = that.model.get("link") + encodeURIComponent(" AND " + word);

              }

            })

          }
          else {
            g = d3.select(this.$(".wordcloud-svg")[0]).select("#words-group")
          }

          var text =  g.selectAll("text")
            .data(words, function (d) {
            return d.text;
          });

          //enter selection
          text.enter()
            .append("text")
            .classed("s-wordcloud-text", true)
            .text(function(d) { return d.text; })
            .style("fill", function(d, i) {

              return  renderVals.fill(d.origSize);
            })
            .attr("transform", function(d, i) {
              //split into 4 groups to come from 4 diff directions
              if (i < 15) {
                return "translate(" + [Math.random()*width, - height/2] + ")";
              }
              else if (i< 30)
              {
                return "translate(" + [Math.random()* width, + height/2 ] + ")";
              }
              else if ( i < 45)
              {
                return "translate(" + [- width/2, +Math.random() * height] + ")";
              }
              else
              {
                return "translate(" + [width/2, -Math.random()* height] + ")";
              }
            })

          //exit selection
          text
            .exit()
            .style("opacity", 0)
            .remove();

          var that = this;

          // update selection
          text
            .style("font-size", function(d) {return d.size})
            .style("fill", function(d, i) {return renderVals.fill(d.origSize);})
            .transition()
            .duration(1000)
            .attr("transform", function(d)
            {
              return "translate(" + [d.x, d.y] + ")";
            });
        }

      });

      var WordCloudModel = Backbone.Model.extend({

        initialize : function(){
          this.buildWCDict();
          this.on("change:currentSliderVal", this.buildWCDict)

        },

        defaults: {
          //raw data
          tfIdf   : undefined,
          link : undefined,
          bibcode : undefined,

          currentSliderVal : 3,
          //this is what the view uses to render a cloud
          processedWordList : [],

          renderVals : {
          fill : undefined,
          glowScale : undefined,
          blur : undefined

          },
          //is this the right place to put this?
          colorRange: ["#80E6FF", "#7575FF", "#7575FF", "#47008F"],
          sliderRange: {'1':[1,0], '2':[.75, .25], '3':[.5,.5], '4':[.25,.75], '5':[0,1]},

        },

        reset: function () {
          this.set(this.defaults, {silent : true});
        },

        buildWCDict: function () {

          var dict, numWords, meanTF, meanIDF, wordDict, min, max;
          var sliderRange, currentSliderVal;
          var freq, idf, modifiedVal, wordList, renderVals;

          dict = this.get("tfIdf");

          numWords = _.size(dict);

          meanTF = _.reduce(_.map(_.values(dict), function (x) {
              return x['total_occurrences']
            }), function (m, n) {
              return m + n
            }, 0) / numWords;

          meanIDF = _.reduce(_.map(_.values(dict), function (x) {
            if (x['idf']) {
              return x['idf']
            }
            else {
              return 0
            }
          }), function (m, n) {
            return m + n
          }, 0) / numWords;


          sliderRange = this.get("sliderRange");
          currentSliderVal = this.get("currentSliderVal")

          wordDict = _.map(dict, function (val, key) {

            freq = val['total_occurrences'] / meanTF;
            idf = val['idf'] / meanIDF

            modifiedVal = sliderRange[currentSliderVal][0] * idf + sliderRange[currentSliderVal][1] * freq;
            // some stuff might be NaN, so do || 0
            return [key, modifiedVal || 0]
          });

          // sort to get 50 top candidates
          wordDict = _.last(_.sortBy(wordDict, function (l) {
            return l[1]
          }), 50);

          wordDict = _.object(wordDict);
          min = _.min(_.values(wordDict));
          max = _.max(_.values(wordDict));

          wordList = [];

          renderVals = {};

          renderVals.fill = d3.scale.log().domain([min, max]);
          renderVals.fill.domain([0, .25, 0.5, 0.75, 1].map(renderVals.fill.invert))
            .range(this.get("colorRange")).clamp(true);

          var pixelScale = d3.scale.log().domain([min, max]).range([30, 70]);

          for (var entry in wordDict) {
            wordList.push({text: entry, size: pixelScale(wordDict[entry]), select: false, origSize: wordDict[entry]})
          }

          this.set("renderVals", renderVals);
          this.set("processedWordList", wordList);

        }

      });


  var WordCloudWidget = Marionette.Controller.extend({

        initialize: function (options) {
          var data = options
          this.model = new WordCloudModel(data);
          this.view = new WordCloudView({model: this.model});
        }



  });


(function(){

  var n = 0

  _.each(config.cloud_info, function(data){

    setTimeout(function(){

    data.link = config.meta.adsSearchLink + "q=bibcode:" + data.bibcode;

    var widget = new WordCloudWidget(data)

    $(".wordclouds").append(widget.view.render().el);

    }, n)

    n+=1000;


});


//attach event handler


})()


