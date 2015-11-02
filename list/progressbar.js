/**
 * Created by Christian on 02.11.2015.
 */
define(["jquery", "d3", "../datastore", "../view", '../../pathfinder_graph/search'], function ($, d3, dataStore, view, ServerSearch) {

    var ITEM_WIDTH = 50;
    var ITEM_HEIGHT = 20;
    var ITEM_SPACING = 2;


    function ProgressBar() {
        view.call(this, "#pathProgress");
        this.lengthHistogram = {};
        this.maxLength = 0;
    }

    ProgressBar.prototype = Object.create(view.prototype);

    ProgressBar.prototype.init = function () {
        //view.prototype.init.call(this);
        //var that = this;
        //ServerSearch.on({
        //    query_start: function () {
        //        //reset();
        //        that.reset();
        //    },
        //    query_path: function (event, data) {
        //        that.update(data.path);
        //        //dataStore.addPath(data.path);
        //        //console.log("added path " +(x++))
        //    },
        //    query_done: function () {
        //        that.render(-1);
        //    }
        //});

        //var svg = d3.select
    };


    ProgressBar.prototype.getMinSize = function () {
        return {width: this.maxLength * ITEM_WIDTH + (this.maxLength - 1) * ITEM_SPACING, height: ITEM_HEIGHT + 10};
    };

    ProgressBar.prototype.reset = function () {
        var that = this;
        var allPaths = dataStore.getPaths();
        this.lengthHistogram = {};
        this.maxLength = 0;
        allPaths.forEach(function (p) {
            that.lengthHistogram[p.nodes.length.toString()] = that.lengthHistogram[p.nodes.length.toString()] || {
                    length: p.nodes.length,
                    numPaths: 0
                };
            that.lengthHistogram[p.nodes.length.toString()].numPaths++;
            if (that.maxLength < p.nodes.length) {
                that.maxLength = p.nodes.length;
            }
        });

        this.fillHistogram();

        this.render(0);
    };

    ProgressBar.prototype.fillHistogram = function () {
        var that = this;
        for (var i = 1; i <= (that.maxLength < 1 ? 1 : that.maxLength); i++) {
            that.lengthHistogram[i.toString()] = that.lengthHistogram[i.toString()] || {
                    length: i,
                    numPaths: 0
                };
        }
    };

    ProgressBar.prototype.update = function (path, added) {

        this.lengthHistogram[path.nodes.length.toString()] = this.lengthHistogram[path.nodes.length.toString()] || {
                length: path.nodes.length,
                numPaths: 0
            };
        if (added) {
            this.lengthHistogram[path.nodes.length.toString()].numPaths++;
            if (path.nodes.length > this.maxLength) {
                this.maxLength = path.nodes.length;
                this.fillHistogram();
            }
        }

        this.render(path.nodes.length - 1);
    };

    //ProgressBar.prototype.render = function (progressIndex) {
    //    var that = this;
    //    var svg = d3.select("#pathProgress svg");
    //
    //    var data = Object.keys(that.lengthHistogram).map(function (key) {
    //        return that.lengthHistogram[key];
    //    });
    //
    //
    //    var allItems = svg.selectAll("g.lengthItem").data(data);
    //
    //    var items = allItems.enter().append("g")
    //        .classed("lengthItem", true);
    //
    //
    //    items.each(function (data, i) {
    //        var item = d3.select(this);
    //
    //        item.append("rect")
    //            .classed("progressBarItem", true)
    //            .attr({
    //                rx: 5,
    //                ry: 5,
    //                x: i * ITEM_WIDTH + (i - 1) * ITEM_SPACING,
    //                y: 0,
    //                width: ITEM_WIDTH,
    //                height: ITEM_HEIGHT
    //            });
    //
    //        item.append("text")
    //            .classed("length", true)
    //            .attr({
    //                x: i * ITEM_WIDTH + (i - 1) * ITEM_SPACING,
    //                y: 12
    //            })
    //            .text("\uf110")
    //            .classed("fa-spin", true)
    //            .style({"font-family": "FontAwesome, sans-serif"});
    //
    //        item.append("text")
    //            .classed("numPaths", true)
    //            .attr({
    //                x: i * ITEM_WIDTH + (i - 1) * ITEM_SPACING,
    //                y: 24
    //            })
    //            .text(data.numPaths);
    //    });
    //
    //    allItems.each(function (data, i) {
    //        var item = d3.select(this);
    //
    //        item.select("text.length")
    //            .text("\uf110");
    //        item.select("text.numPaths")
    //            .text(data.numPaths);
    //
    //
    //        var spinner = item.select("foreignObject.spinner");
    //        if (i == progressIndex) {
    //            if (spinner.empty()) {
    //                item.append("foreignObject")
    //                    .classed("spinner", true)
    //                    .attr({
    //                        x: i * ITEM_WIDTH + (i - 1) * ITEM_SPACING + 20,
    //                        y: 2,
    //                        width: 20,
    //                        height: 20
    //                    }).append("xhtml:div")
    //                    .html('<i class="fa fa-spin fa-pulse">\uf110</i>');
    //            }
    //        } else {
    //            spinner.remove();
    //        }
    //
    //    });
    //
    //    allItems.exit().remove();
    //
    //    this.updateViewSize();
    //
    //
    //};

    ProgressBar.prototype.render = function (progressIndex) {
        var that = this;
        var svg = d3.select("#pathProgress");

        var data = Object.keys(that.lengthHistogram).map(function (key) {
            return that.lengthHistogram[key];
        });


        var allItems = svg.selectAll("div.progressBarItem").data(data);

        var items = allItems.enter().append("div")
            .classed({
                progressBarItem: true,
                //"bg-primary": true
            });


        items.each(function (data, i) {
            var item = d3.select(this);

            item.append("label")
                .classed("length", true)
                .style({
                    "font-style": "italic",
                    "font-weight": "normal",
                    "text-align": "center",
                    display: "block"
                })
                //.attr({
                //    x: i * ITEM_WIDTH + (i - 1) * ITEM_SPACING,
                //    y: 12
                //})
                .text(data.length);

            var bar = item.append("div")
                .classed({
                    bar: true,
                    "bg-primary": true
                });

            //style({width: "100px"});

            var textCont = bar.append("div")
                .style({
                    display: "inline-block",
                    width: "50px"
                });


            textCont.append("label")
                .classed("numPaths", true)
                .style({
                    "font-weight": 600,
                    display: "block",
                    "text-align": "center",
                    "padding": 0,
                    "margin": 0
                })
                //.attr({
                //    x: i * ITEM_WIDTH + (i - 1) * ITEM_SPACING,
                //    y: 24
                //})
                .text(data.numPaths);
        });

        allItems.each(function (data, i) {
                var item = d3.select(this);

                item.select("label.length")
                    .text(data.length);
                item.select("label.numPaths")
                    .text(data.numPaths);

                var bar = item.select("div.bar");


                var spinner = item.select("i");
                if (i == progressIndex) {
                    if (spinner.empty()) {
                        bar.append("i")
                            .attr("class", "fa fa-spin fa-pulse")
                            .text("\uf110")
                            .style({
                                position: "relative",
                                top: "0px",
                                left: "-10px"
                            }
                        )
                        ;
                    }
                }
                else {
                    spinner.remove();
                }

            }
        )
        ;

        allItems.exit().remove();

        this.updateViewSize();


    };


    return new ProgressBar();
})
;