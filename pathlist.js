define(['jquery', 'd3', './listeners', './sorting', './setinfo', './selectionutil', './pathsorting', './pathutil'],
  function ($, d3, listeners, sorting, setInfo, selectionUtil, pathSorting, pathUtil) {
    'use strict';

    //var jsonPaths = require('./testpaths1.json');



    var nodeStart = 90;
    var setTypeIndent = 10;
    var nodeWidth = 50;
    var nodeHeight = 20;
    var vSpacing = 5;
    var pathHeight = nodeHeight + 2 * vSpacing;
    var edgeSize = 50;
    var arrowWidth = 7;
    var setHeight = 10;
    var pathSpacing = 15;

    var currentSetTypeId = 0;

    var sortingManager = pathSorting.sortingManager;
    var sortingStrategies = pathSorting.sortingStrategies;

    var pathListUpdateTypes = {
      UPDATE_NODE_SET_VISIBILITY: "UPDATE_NODE_SET_VISIBILITY"
    }

    var showNodeSets = false;

    function SetRep(setId, type) {
      this.id = setId;
      this.nodeIndices = [];
      this.relIndices = [];
      this.setType = type;
    }

    SetRep.prototype = {
      getHeight: function () {
        return setHeight;
      },

      //Defines whether this set can be shown. Only considers own data to determine that, not e.g. whether its set type is collapsed.
      canBeShown: function () {
        return showNodeSets || (!showNodeSets && this.relIndices.length > 0);
      }
    }

    function SetType(type) {
      this.id = currentSetTypeId++;
      this.type = type;
      this.sets = [];
      this.setDict = {};
      this.collapsed = false;
      this.nodeIndices = [];
      this.relIndices = [];
    }

    SetType.prototype = {
      getHeight: function () {
        var height = setHeight;
        if (!this.collapsed) {
          this.sets.forEach(function (setRep) {
            if (setRep.canBeShown()) {
              height += setRep.getHeight();
            }
          });
        }
        return height;
      },

      canBeShown: function () {
        return showNodeSets || (!showNodeSets && this.relIndices.length > 0);
      }
    };

    function PathWrapper(path) {
      this.path = path;
      this.addPathSets(path);
    }

    PathWrapper.prototype = {

      getHeight: function () {
        var height = pathHeight;
        this.setTypes.forEach(function (setType) {
          if (setType.canBeShown()) {
            height += setType.getHeight();
          }
        });

        return height;
      },

      getWidth: function () {
        var height = pathHeight;
        this.setTypes.forEach(function (setType) {
          if (setType.canBeShown()) {
            height += setType.getHeight();
          }
        });

        return nodeStart + this.path.nodes.length * nodeWidth + this.path.edges.length * edgeSize;
      },

      addPathSets: function (path) {

        var setTypeDict = {};
        var setTypeList = [];

        for (var i = 0; i < path.nodes.length; i++) {
          var node = path.nodes[i];
          for (var key in node.properties) {
            if (pathUtil.isNodeSetProperty(key)) {
              var property = node.properties[key];
              if (property instanceof Array) {
                property.forEach(function (setId) {
                  addSetForNode(key, setId, i);
                });
              } else {
                var currentSet = addSet(key, property);
                addSetForNode(key, property, i);
              }
            }
          }
        }
        ;

        for (var i = 0; i < path.edges.length; i++) {
          var edge = path.edges[i];

          for (var key in edge.properties) {
            if (pathUtil.isEdgeSetProperty(key)) {
              var property = edge.properties[key];
              if (property instanceof Array) {
                edge.properties[key].forEach(function (setId) {
                  addSetForEdge(key, setId, i);
                });
              } else {
                addSetForEdge(key, property, i);
              }
            }
          }
        }

        function addSetForNode(type, setId, nodeIndex) {
          var currentSet = addSet(type, setId);
          currentSet.nodeIndices.push(nodeIndex);
          var currentSetType = setTypeDict[type];
          if (currentSetType.nodeIndices.indexOf(nodeIndex) === -1) {
            currentSetType.nodeIndices.push(nodeIndex);
          }
        }

        function addSetForEdge(type, setId, relIndex) {
          var currentSet = addSet(type, setId);
          currentSet.relIndices.push(relIndex);
          var currentSetType = setTypeDict[type];
          if (currentSetType.relIndices.indexOf(relIndex) === -1) {
            currentSetType.relIndices.push(relIndex);
          }
        }

        function addSet(type, setId) {
          var setType = setTypeDict[type];

          if (typeof setType === "undefined") {
            setType = new SetType(type);
            //setType = {type: type, sets: [], setDict: {}, collapsed: false, nodeIndices: [], relIndices: []};
            setTypeDict[type] = setType;
            setTypeList.push(setType);
          }

          var mySet = setType.setDict[setId];
          if (typeof mySet === "undefined") {
            mySet = new SetRep(setId, type);
            //mySet = {id: setId, nodeIndices: [], relIndices: [], setType: type};
            setType.setDict[setId] = mySet;
            setType.sets.push(mySet);
          }
          return mySet;
        }

        setTypeList.forEach(function (setType) {
          delete setType.setDict;
        });

        this.setTypes = setTypeList;
      }
    };




//var allPaths = [];

    function getPathContainerTransformFunction(pathWrappers) {
      return function (d, i) {
        var posY = 0;
        for (var index = 0; index < i; index++) {
          posY += pathWrappers[index].getHeight() + pathSpacing;
        }
        return "translate(0," + posY + ")";
      };
    }

    function getSetTypeTransformFunction(pathWrappers) {

      return function (d, i) {
        var pathWrapper = pathWrappers[d.pathIndex];

        var posY = pathHeight;
        for (var typeIndex = 0; typeIndex < i; typeIndex++) {
          var setType = pathWrapper.setTypes[typeIndex];
          if (setType.canBeShown()) {
            posY += setType.getHeight();
          }
        }

        return "translate(0," + posY + ")";
      }
    }

    function getSetTransformFunction(pathWrappers) {
      return function (d, i) {
        var setType = pathWrappers[d.pathIndex].setTypes[d.setTypeIndex];

        var posY = setHeight;
        for (var setIndex = 0; setIndex < i; setIndex++) {
          var set = setType.sets[setIndex];
          if (set.canBeShown()) {
            posY += set.getHeight();
          }
        }
        return "translate(0," + posY + ")";
      }

    }


    function updateSets(setInfo) {

      var svg = d3.select("#pathlist svg");

      svg.selectAll("g.pathContainer g.setGroup g.set text")
        .text(function (d) {
          var info = setInfo.get(d.set.id);

          if (typeof info === "undefined") {
            //return getClampedText(d[0].id, 15);
            return d.set.id;
          }

          var text = info.properties["name"];
          //return getClampedText(text, 15);
          return text;
        });

      svg.selectAll("g.pathContainer g.setGroup g.set title")
        .text(function (d) {
          var info = setInfo.get(d.set.id);

          if (typeof info === "undefined") {
            return d.set.id;
          }
          return info.properties["name"];
        });
    }

    function getClampedText(text, maxLength) {
      if (text.length > maxLength) {
        return text.substring(0, maxLength);
      }
      return text;
    }


    function getPathKey(d) {
      return d.path.id;
    }


    function isSourceNodeLeft(nodes, edge, edgeIndex) {
      return nodes[edgeIndex].id === edge.sourceNodeId;
    }


    function PathList() {
      this.pathWrappers = [];
      this.updateListeners = [];
      this.selectionListeners = [];
      var that = this;
      this.listUpdateListener = function (updatedObject) {
        that.updatePathList();
      }

      this.sortUpdateListener = function (currentComparator) {
        //sortingManager.sort(that.pathWrappers, that.parent, "g.pathContainer", getPathContainerTransformFunction(that.pathWrappers), sortStrategyChain);

        that.pathWrappers.sort(currentComparator);

        that.updateDataBinding();

        that.parent.selectAll("g.pathContainer")
          .sort(currentComparator)
          .transition()
          .attr("transform", getPathContainerTransformFunction(that.pathWrappers));
      }
    }

    PathList.prototype = {
      wrapPaths: function (paths) {
        var that = this;
        paths.forEach(function (path) {
          that.pathWrappers.push(new PathWrapper(path));
        });
      },

      addUpdateListener: function (l) {
        this.updateListeners.push(l);
      },

      notifyUpdateListeners: function () {
        var that = this;
        this.updateListeners.forEach(function (l) {
          l(that);
        })
      },

      appendWidgets: function (widgetParent) {

        var pathlist = this;


        var selectSortingStrategy = $('<select>').appendTo(widgetParent)[0];
        $(selectSortingStrategy).append($("<option value='0'>Set Count Edge Weight</option>"));
        $(selectSortingStrategy).append($("<option value='1'>Path Length</option>"));
        $(selectSortingStrategy).on("change", function () {
          if (this.value == '0') {
            sortingManager.setStrategyChain([sortingStrategies.setCountEdgeWeight, sortingStrategies.pathId]);
            listeners.notify(pathSorting.updateType, sortingManager.currentComparator);

            //sortingManager.sort(pathlist.pathWrappers, svg, "g.pathContainer", getPathContainerTransformFunction(pathlist.pathWrappers), [sortingStrategies.setCountEdgeWeight, sortingStrategies.pathId]);
          }
          if (this.value == '1') {
            sortingManager.setStrategyChain([sortingStrategies.pathLength, sortingStrategies.pathId]);
            listeners.notify(pathSorting.updateType, sortingManager.currentComparator);
            //sortingManager.sort(pathlist.pathWrappers, svg, "g.pathContainer", getPathContainerTransformFunction(pathlist.pathWrappers), [sortingStrategies.pathLength, sortingStrategies.pathId]);
          }
        });

        widgetParent.append("label").text("Reverse");

        var sortButton = $('<input>').appendTo(widgetParent)[0];
        $(sortButton).attr("type", "checkbox");
        $(sortButton).on("click", function () {
          var that = this;
          sortingManager.ascending = !this.checked;
          listeners.notify(pathSorting.updateType, sortingManager.currentComparator);
          //sortingManager.sort(pathlist.pathWrappers, svg, "g.pathContainer", getPathContainerTransformFunction(pathlist.pathWrappers));
        });

        widgetParent.append("label").text("Hide non-relationship sets");

        var hideNodeOnlySetsButton = $('<input>').appendTo(widgetParent)[0];
        $(hideNodeOnlySetsButton).attr("type", "checkbox")
          .prop("checked", true);
        $(hideNodeOnlySetsButton).on("click", function () {
          showNodeSets = !this.checked;
          listeners.notify(pathListUpdateTypes.UPDATE_NODE_SET_VISIBILITY, showNodeSets);
        });
      }
      ,
      init: function () {
        listeners.add(updateSets, listeners.updateType.SET_INFO_UPDATE);
        listeners.add(this.listUpdateListener, pathListUpdateTypes.UPDATE_NODE_SET_VISIBILITY);
        listeners.add(this.sortUpdateListener, pathSorting.updateType);
      },

      updatePathList: function () {

        //var setComboContainer = parent.selectAll("g.pathContainer g.setType")
        //  .transition()


        //d3.select(this).attr("display", function (d) {
        //  if (showNodeSets) {
        //    return "inline";
        //  }
        //  return d.setType.relIndices.length > 0 ? "inline" : "none";
        //});

        //d3.select(this).selectAll("g.set")
        //  .attr("display", function (d) {
        //    if (showNodeSets) {
        //      return "inline";
        //    }
        //    return d.set.relIndices.length > 0 ? "inline" : "none";
        //  })


        var that = this;

        that.parent.selectAll("g.pathContainer")
          .transition()
          .attr("transform", getPathContainerTransformFunction(this.pathWrappers));


        that.parent.selectAll("g.pathContainer")
          .each(function () {
            d3.select(this).selectAll("g.setType")
              .transition()
              .each("start", function (d) {
                if (d.setType.collapsed) {
                  d3.select(this).selectAll("g.setTypeSummary")
                    .attr("display", "inline");
                }

                d3.select(this).selectAll("g.set")
                  .each(function (setData) {
                    if (d.setType.collapsed || (!setData.set.canBeShown())) {
                      d3.select(this)
                        .attr("display", "none");
                    }
                  });
                if (!d.setType.canBeShown()) {
                  d3.select(this)
                    .attr("display", "none");
                }
              })
              .attr("transform", getSetTypeTransformFunction(that.pathWrappers))
              .each("end", function (d) {

                if (!d.setType.collapsed) {
                  d3.select(this).selectAll("g.setTypeSummary")
                    .attr("display", "none");
                }

                d3.select(this).selectAll("g.set")
                  .each(function (setData) {
                    if (!d.setType.collapsed && setData.set.canBeShown()) {
                      d3.select(this)
                        .attr("display", "inline");
                    }
                  });

                if (d.setType.canBeShown()) {
                  d3.select(this)
                    .attr("display", "inline");
                }
              });

            d3.select(this).selectAll("g.setType")
              .each(function () {
                d3.select(this).selectAll("g.set")
                  .transition()
                  .attr("transform", getSetTransformFunction(that.pathWrappers));
              });

          });

        this.notifyUpdateListeners();
      }
      ,

      destroy: function () {
        this.removePaths();
        listeners.remove(this.listUpdateListener, pathListUpdateTypes.UPDATE_NODE_SET_VISIBILITY);
        listeners.remove(updateSets, listeners.updateType.SET_INFO_UPDATE);
        listeners.remove(this.sortUpdateListener, pathSorting.updateType);
      },

      removeGuiElements: function () {

        selectionUtil.removeListeners(this.selectionListeners);
        this.selectionListeners = [];
        currentSetTypeId = 0;

        if (typeof this.parent === "undefined")
          return;

        this.parent.selectAll("g.pathContainer")
          .remove();

        //parent.select("#arrowRight").remove();
        //parent.select("#SetLabelClipPath").remove();


      }
      ,

      removePaths: function () {
        this.removeGuiElements(this.parent);
        this.pathWrappers = [];
      }
      ,


      render: function (parent) {
        this.parent = parent;

        if (this.pathWrappers.length > 0) {

          this.renderPaths();
        }
      }
      ,

      setPaths: function (paths) {
        this.pathWrappers = [];
        this.wrapPaths(paths);
      },

      addPath: function (path) {
        this.pathWrappers.push(new PathWrapper(path));
      }
      ,

      getSize: function () {
        var totalHeight = 0;
        var currentMaxWidth = 0;

        this.pathWrappers.forEach(function (pathWrapper) {
          totalHeight += pathWrapper.getHeight() + pathSpacing;
          var currentWidth = pathWrapper.getWidth();
          if (currentWidth > currentMaxWidth) {
            currentMaxWidth = currentWidth;
          }
        });
        return {width: currentMaxWidth, height: totalHeight};
      }
      ,

      updateDataBinding: function () {
        var pathContainers = this.parent.selectAll("g.pathContainer")
          .data(this.pathWrappers, getPathKey);

        pathContainers.each(function (pathWrapper, i) {

          d3.select(this).selectAll("g.path").selectAll("g.nodeGroup").selectAll("g.node")
            .data(function () {
              return pathWrapper.path.nodes;
            });

          d3.select(this).selectAll("g.path").selectAll("g.edgeGroup").selectAll("g.edge")
            .data(function () {
              return pathWrapper.path.edges.map(function (edge) {
                return {edge: edge, pathIndex: i};
              });
            });

          var setTypes = d3.select(this).selectAll("g.setGroup").selectAll("g.setType")
            .data(function () {
              return pathWrapper.setTypes.map(function (mySetType) {
                return {setType: mySetType, pathIndex: i};
              });
            });

          setTypes.each(function (d, i) {

            d3.select(this).selectAll("g.setTypeSummary").each(function () {
              d3.select(this).selectAll("circle")
                .data(function () {
                  return d.setType.nodeIndices.map(function (index) {
                    return {pathIndex: d.pathIndex, setTypeIndex: i, nodeIndex: index};
                  });
                });

              d3.select(this).selectAll("line")
                .data(function () {
                  return d.setType.relIndices.map(function (index) {
                    return {pathIndex: d.pathIndex, setTypeIndex: i, relIndex: index};
                  });
                })
            });

            var set = d3.select(this)
              .selectAll("g.set")
              .data(function () {
                return d.setType.sets.map(function (myset) {
                  return {set: myset, pathIndex: d.pathIndex, setTypeIndex: i};
                });
              });

            set.each(function (d, i) {
              d3.select(this).selectAll("circle")
                .data(function () {
                  return d.set.nodeIndices.map(function (index) {
                    return {pathIndex: d.pathIndex, setTypeIndex: d.setTypeIndex, setIndex: i, nodeIndex: index};
                  });
                });


              d3.select(this).selectAll("line").
                data(function (d, i) {
                  return d.set.relIndices.map(function (index) {
                    return {pathIndex: d.pathIndex, setTypeIndex: d.setTypeIndex, setIndex: i, relIndex: index};
                  });
                });
            });


          });

        });
      },

      renderPaths: function () {

        var that = this;


        var allPathContainers = that.parent.selectAll("g.pathContainer")
          .data(that.pathWrappers, getPathKey)

        var pathContainer = allPathContainers
          .enter()
          .append("g");


        pathContainer.attr("class", "pathContainer")
          .attr("transform", "translate(0," + that.getSize().height + ")");

        pathContainer.append("rect")
          .classed("pathContainerBackground", true)
          .attr("fill", "#A1D99B")
          .style("opacity", 0.8)
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", "100%")
          .attr("height", function (pathWrapper) {
            return pathWrapper.getHeight();
          });


        //.attr("visibility", visible ? "visible" : "hidden");

        var p = pathContainer.append("g")
          .attr("class", "path");

        p.append("rect")
          .attr("class", "filler")
          .attr("x", nodeStart)
          .attr("y", 0)
          .attr("width", "100%")
          .attr("height", pathHeight);

        var l = selectionUtil.addDefaultListener(pathContainer, "g.path", function (d) {
            return d.path.id;
          },
          "path"
        );
        that.selectionListeners.push(l);

        var nodeGroup = p.append("g")
          .attr("class", "nodeGroup");

        var allNodes = allPathContainers.selectAll("g.path").selectAll("g.nodeGroup").selectAll("g.node")
          .data(function (pathWrapper) {
            return pathWrapper.path.nodes;
          });

        //var node = nodeGroup.selectAll("g.node")
        //  .data(function (pathWrapper) {
        //    return pathWrapper.path.nodes;
        //  })
        var node = allNodes.enter()
          .append("g")
          .attr("class", "node")

          .on("dblclick", function (d) {
            sortingManager.addOrReplace(sortingStrategies.getNodePresenceStrategy([d.id]));
            listeners.notify(pathSorting.updateType, sortingManager.currentComparator);
            //sortingManager.sort(that.pathWrappers, parent, "g.pathContainer", getPathContainerTransformFunction(that.pathWrappers));
          });
        var l = selectionUtil.addDefaultListener(nodeGroup, "g.node", function (d) {
            return d.id;
          },
          "node"
        );
        that.selectionListeners.push(l);


        node.append("rect")
          .attr("x", function (d, i) {
            return nodeStart + (i * nodeWidth) + (i * edgeSize);
          })
          .attr("y", vSpacing)
          .attr("rx", 5).attr("ry", 5)
          .attr("width", nodeWidth)
          .attr("height", nodeHeight);
        //.attr("fill", "rgb(200,200,200)")
        //.attr("stroke", "rgb(30,30,30)");

        node.append("text")
          .text(function (d) {
            var text = d.properties["id"];
            return getClampedText(text, 7);
          })
          .attr("x", function (d, i) {
            return nodeStart + (i * nodeWidth) + (i * edgeSize) + nodeWidth / 2;
          })
          .attr("y", vSpacing + nodeHeight - 5)
          .append("title")
          .text(function (d) {
            return d.properties["name"];
          });
        ;

        var edgeGroup = p.append("g")
          .attr("class", "edgeGroup");


        var allEdges = allPathContainers.selectAll("g.path").selectAll("g.edgeGroup").selectAll("g.edge")
          .data(function (pathWrapper, i) {
            return pathWrapper.path.edges.map(function (edge) {
              return {edge: edge, pathIndex: i};
            });
          });

        //var edge = edgeGroup.selectAll("g.edge")
        //  .data(function (pathWrapper, i) {
        //    return pathWrapper.path.edges.map(function (edge) {
        //      return {edge: edge, pathIndex: i};
        //    });
        //  })
        var edge = allEdges
          .enter()
          .append("g")
          .attr("class", "edge");

        edge.append("line")
          .attr("x1", function (d, i) {
            if (isSourceNodeLeft(that.pathWrappers[d.pathIndex].path.nodes, d.edge, i)) {
              return ( nodeStart + (i + 1) * nodeWidth) + (i * edgeSize);
            } else {
              return ( nodeStart + (i + 1) * nodeWidth) + ((i + 1) * edgeSize);
            }
          })
          .attr("y1", vSpacing + nodeHeight / 2)
          .attr("x2", function (d, i) {
            if (isSourceNodeLeft(that.pathWrappers[d.pathIndex].path.nodes, d.edge, i)) {
              return ( nodeStart + (i + 1) * nodeWidth) + ((i + 1) * edgeSize) - arrowWidth;
            } else {
              return ( nodeStart + (i + 1) * nodeWidth) + (i * edgeSize) + arrowWidth;
            }
          })
          .attr("y2", vSpacing + nodeHeight / 2)
          .attr("marker-end", "url(#arrowRight)")
          .attr("display", function (d) {
            return d.edge.properties["_isNetworkEdge"] ? "inline" : "none";
          });

        var setGroup = pathContainer.append("g")
          .attr("class", "setGroup");

        var allSetTypes = allPathContainers.selectAll("g.setGroup").selectAll("g.setType")
          .data(function (pathWrapper, i) {
            return pathWrapper.setTypes.map(function (mySetType) {
              return {setType: mySetType, pathIndex: i};
            });
          });


        //var setType = setGroup.selectAll("g.setType")
        //    .data(function (pathWrapper, i) {
        //      return pathWrapper.setTypes.map(function (mySetType) {
        //        return {setType: mySetType, pathIndex: i};
        //      });
        //    })
        var setType = allSetTypes.enter()
            .append("g")
            .classed("setType", true)
            .attr({
              display: function (d) {

                if (d.setType.canBeShown()) {
                  return "inline";
                }
                return "none";
              },
              transform: getSetTypeTransformFunction(that.pathWrappers)
            }
          )
          ;

        setType.append("text")
          .attr("class", "collapseIconSmall");

        allSetTypes.selectAll("text.collapseIconSmall")
          .attr("x", 5)
          .attr("y", setHeight)
          .text(function (d) {
            return d.setType.collapsed ? "\uf0da" : "\uf0dd";
          })
          .on("click", function (d) {
            d.setType.collapsed = !d.setType.collapsed;
            d3.select(this).text(d.setType.collapsed ? "\uf0da" : "\uf0dd");
            that.updatePathList();
            //updateSetList(parent);
          });

        setType.append("text")
          .text(function (d) {
            //var text = d[0].id;
            //return getClampedText(text, 15);
            return d.setType.type;
          })
          .attr("x", 10)
          .attr("y", setHeight)
          .attr("fill", function (d) {
            return setInfo.getSetTypeInfo(d.setType.type).color;
          })
          .attr("clip-path", "url(#SetLabelClipPath)");

        var setTypeSummaryContainer = setType.append("g")
          .classed("setTypeSummary", true)
          .attr("display", function (d) {
            return d.setType.collapsed ? "inline" : "none";
          });

        setTypeSummaryContainer.each(function (d, i) {
            d3.select(this).selectAll("circle")
              .data(function () {
                return d.setType.nodeIndices.map(function (index) {
                  return {pathIndex: d.pathIndex, setTypeIndex: i, nodeIndex: index};
                });
              })
              .enter()
              .append("circle")
              .attr({
                cx: function (d) {
                  return nodeStart + (d.nodeIndex * nodeWidth) + (d.nodeIndex * edgeSize) + nodeWidth / 2;
                },
                cy: setHeight / 2,
                r: 4,
                fill: function (d) {
                  return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
                }
              });


            d3.select(this).selectAll("line")
              .data(function () {
                return d.setType.relIndices.map(function (index) {
                  return {pathIndex: d.pathIndex, setTypeIndex: i, relIndex: index};
                });
              })
              .enter()
              .append("line")
              .attr({
                x1: function (d) {
                  return nodeStart + (d.relIndex * nodeWidth) + (d.relIndex * edgeSize) + nodeWidth / 2;
                }
                ,
                y1: setHeight / 2,
                x2: function (d) {
                  return nodeStart + ((d.relIndex + 1) * nodeWidth) + ((d.relIndex + 1) * edgeSize) + nodeWidth / 2;
                },
                y2: setHeight / 2,
                stroke: function (d) {
                  return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
                }
              });
          }
        )
        ;


        setType.each(function (d, i) {
          var set = d3.select(this)
            .selectAll("g.set")
            .data(function () {
              return d.setType.sets.map(function (myset) {
                return {set: myset, pathIndex: d.pathIndex, setTypeIndex: i};
              });
            })
            .enter()
            .append("g")
            .classed("set", true)
            .attr({
              display: function (d) {
                if (d.set.canBeShown()) {
                  return "inline";
                }
                return "none";
              },
              transform: getSetTransformFunction(that.pathWrappers)
            })
            .on("dblclick", function (d) {
              sortingManager.addOrReplace(sortingStrategies.getSetPresenceStrategy([d.set.id]));
              listeners.notify(pathSorting.updateType, sortingManager.currentComparator);
              //sortingManager.sort(that.pathWrappers, parent, "g.pathContainer", getPathContainerTransformFunction(that.pathWrappers));
            });

          set.append("rect")
            .attr("class", "filler")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", "100%")
            .attr("height", setHeight)

          set.append("text")
            .text(function (d) {
              //var text = d[0].id;
              //return getClampedText(text, 15);

              var info = setInfo.get(d.set.id);
              if (typeof info === "undefined") {
                return d.set.id;
              }
              return info.properties["name"];
            })
            .attr("x", setTypeIndent)
            .attr("y", setHeight)
            .attr("fill", function (d) {
              return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
            })
            .attr("clip-path", "url(#SetLabelClipPath)");

          set.append("title")
            .text(function (d) {
              var info = setInfo.get(d.set.id);
              if (typeof info === "undefined") {
                return d.set.id;
              }
              return info.properties["name"];
            });

          set.each(function (d, i) {
            d3.select(this).selectAll("circle")
              .data(function () {
                return d.set.nodeIndices.map(function (index) {
                  return {pathIndex: d.pathIndex, setTypeIndex: d.setTypeIndex, setIndex: i, nodeIndex: index};
                });
              })
              .enter()
              .append("circle")
              .attr({
                cx: function (d) {
                  return nodeStart + (d.nodeIndex * nodeWidth) + (d.nodeIndex * edgeSize) + nodeWidth / 2;
                },
                cy: function (d) {
                  return setHeight / 2;
                },
                r: 4,
                fill: function (d) {
                  return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
                }
              })

            d3.select(this).selectAll("line").
              data(function (d, i) {
                return d.set.relIndices.map(function (index) {
                  return {pathIndex: d.pathIndex, setTypeIndex: d.setTypeIndex, setIndex: i, relIndex: index};
                });
              })
              .enter()
              .append("line")
              .attr("x1", function (d) {
                return nodeStart + (d.relIndex * nodeWidth) + (d.relIndex * edgeSize) + nodeWidth / 2;
              })
              .attr("y1", function (d) {
                return setHeight / 2;
                //return 2 * vSpacing + nodeHeight + (d.setIndex + 1) * setHeight - 5;
              })
              .attr("x2", function (d) {
                return nodeStart + ((d.relIndex + 1) * nodeWidth) + ((d.relIndex + 1) * edgeSize) + nodeWidth / 2;
              })
              .attr("y2", function (d) {
                return setHeight / 2;
                //return 2 * vSpacing + nodeHeight + (d.setIndex + 1) * setHeight - 5;
              })
              .attr("stroke", function (d) {
                return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
              });


          });


        });


        var l = selectionUtil.addDefaultListener(setType, "g.set", function (d) {
            return d.set.id;
          },
          "set"
        );
        that.selectionListeners.push(l);

        this.sortUpdateListener(sortingManager.currentComparator);

        pathContainer.selectAll("rect.pathContainerBackground").transition()
          .duration(800)
          .style("opacity", 0);

        //allPathContainers.transition()
        //  .attr("transform", getPathContainerTransformFunction(that.pathWrappers));


        //function getSetPositionY(pathIndex, setTypeIndex, setIndex) {
        //  var pathWrapper = that.pathWrappers[pathIndex];
        //
        //  var numSets = 0;
        //  for (var typeIndex = 0; typeIndex < setTypeIndex; typeIndex++) {
        //    var setType = pathWrapper.setTypes[typeIndex];
        //    numSets += setType.sets.length;
        //  }
        //
        //  return 2 * vSpacing + nodeHeight + (numSets + setIndex + setTypeIndex + 1) * setHeight;
        //}


      }

      //renderPaths: function (parent) {
      //
      //  var that = this;
      //
      //
      //  var pathContainer = parent.selectAll("g.pathContainer")
      //    .data(that.pathWrappers, getPathKey)
      //    .enter()
      //    .append("g");
      //
      //  pathContainer.attr("class", "pathContainer")
      //    .attr("transform", getPathContainerTransformFunction(that.pathWrappers));
      //  //.attr("visibility", visible ? "visible" : "hidden");
      //
      //  var p = pathContainer.append("g")
      //    .attr("class", "path")
      //    .on("click", function (d) {
      //      listeners.notify(d.path, listeners.updateType.PATH_SELECTION);
      //    });
      //
      //  p.append("rect")
      //    .attr("class", "filler")
      //    .attr("x", nodeStart)
      //    .attr("y", 0)
      //    .attr("width", "100%")
      //    .attr("height", pathHeight);
      //
      //  var nodeGroup = p.append("g")
      //    .attr("class", "nodeGroup");
      //
      //  var node = nodeGroup.selectAll("g.node")
      //    .data(function (pathWrapper) {
      //      return pathWrapper.path.nodes;
      //    })
      //    .enter()
      //    .append("g")
      //    .attr("class", "node")
      //
      //    .on("dblclick", function (d) {
      //      sortingManager.addOrReplace(sortingStrategies.getNodePresenceStrategy([d.id]));
      //      sortingManager.sort(that.pathWrappers, parent, "g.pathContainer", getPathContainerTransformFunction(that.pathWrappers));
      //    });
      //  var l = selectionUtil.addDefaultListener(nodeGroup, "g.node", function (d) {
      //      return d.id;
      //    },
      //    "node"
      //  );
      //  selectionListeners.push(l);
      //
      //
      //  node.append("rect")
      //    .attr("x", function (d, i) {
      //      return nodeStart + (i * nodeWidth) + (i * edgeSize);
      //    })
      //    .attr("y", vSpacing)
      //    .attr("rx", 5).attr("ry", 5)
      //    .attr("width", nodeWidth)
      //    .attr("height", nodeHeight);
      //  //.attr("fill", "rgb(200,200,200)")
      //  //.attr("stroke", "rgb(30,30,30)");
      //
      //  node.append("text")
      //    .text(function (d) {
      //      var text = d.properties["name"];
      //      return getClampedText(text, 7);
      //    })
      //    .attr("x", function (d, i) {
      //      return nodeStart + (i * nodeWidth) + (i * edgeSize) + nodeWidth / 2;
      //    })
      //    .attr("y", vSpacing + nodeHeight - 5)
      //    .append("title")
      //    .text(function (d) {
      //      return d.properties["name"];
      //    });
      //  ;
      //
      //  var edgeGroup = p.append("g")
      //    .attr("class", "edgeGroup");
      //
      //  var edge = edgeGroup.selectAll("g.edge")
      //    .data(function (pathWrapper, i) {
      //      return pathWrapper.path.edges.map(function (edge) {
      //        return {edge: edge, pathIndex: i};
      //      });
      //    })
      //    .enter()
      //    .append("g")
      //    .attr("class", "edge");
      //
      //  edge.append("line")
      //    .attr("x1", function (d, i) {
      //      if (isSourceNodeLeft(that.pathWrappers[d.pathIndex].path.nodes, d.edge, i)) {
      //        return ( nodeStart + (i + 1) * nodeWidth) + (i * edgeSize);
      //      } else {
      //        return ( nodeStart + (i + 1) * nodeWidth) + ((i + 1) * edgeSize);
      //      }
      //    })
      //    .attr("y1", vSpacing + nodeHeight / 2)
      //    .attr("x2", function (d, i) {
      //      if (isSourceNodeLeft(that.pathWrappers[d.pathIndex].path.nodes, d.edge, i)) {
      //        return ( nodeStart + (i + 1) * nodeWidth) + ((i + 1) * edgeSize) - arrowWidth;
      //      } else {
      //        return ( nodeStart + (i + 1) * nodeWidth) + (i * edgeSize) + arrowWidth;
      //      }
      //    })
      //    .attr("y2", vSpacing + nodeHeight / 2)
      //    .attr("marker-end", "url(#arrowRight)");
      //
      //  var setGroup = pathContainer.append("g")
      //    .attr("class", "setGroup");
      //
      //  var setType = setGroup.selectAll("g.setType")
      //      .data(function (pathWrapper, i) {
      //        return pathWrapper.setTypes.map(function (mySetType) {
      //          return {setType: mySetType, pathIndex: i};
      //        });
      //      })
      //      .enter()
      //      .append("g")
      //      .classed("setType", true)
      //      .attr({
      //        display: function (d) {
      //
      //          if (d.setType.canBeShown()) {
      //            return "inline";
      //          }
      //          return "none";
      //        },
      //        transform: getSetTypeTransformFunction(that.pathWrappers)
      //      }
      //    )
      //    ;
      //
      //  setType.append("text")
      //    .attr("class", "collapseIconSmall")
      //    .attr("x", 5)
      //    .attr("y", setHeight)
      //    .text(function (d) {
      //      return d.setType.collapsed ? "\uf0da" : "\uf0dd";
      //    })
      //    .on("click", function (d) {
      //      d.setType.collapsed = !d.setType.collapsed;
      //      d3.select(this).text(d.setType.collapsed ? "\uf0da" : "\uf0dd");
      //      that.updatePathList(parent);
      //      //updateSetList(parent);
      //    });
      //
      //  setType.append("text")
      //    .text(function (d) {
      //      //var text = d[0].id;
      //      //return getClampedText(text, 15);
      //      return d.setType.type;
      //    })
      //    .attr("x", 10)
      //    .attr("y", setHeight)
      //    .attr("fill", function (d) {
      //      return setInfo.getSetTypeInfo(d.setType.type).color;
      //    })
      //    .attr("clip-path", "url(#SetLabelClipPath)");
      //
      //  var setTypeSummaryContainer = setType.append("g")
      //    .classed("setTypeSummary", true)
      //    .attr("display", function (d) {
      //      return d.setType.collapsed ? "inline" : "none";
      //    });
      //
      //  setTypeSummaryContainer.each(function (d, i) {
      //      d3.select(this).selectAll("circle")
      //        .data(function () {
      //          return d.setType.nodeIndices.map(function (index) {
      //            return {pathIndex: d.pathIndex, setTypeIndex: i, nodeIndex: index};
      //          });
      //        })
      //        .enter()
      //        .append("circle")
      //        .attr({
      //          cx: function (d) {
      //            return nodeStart + (d.nodeIndex * nodeWidth) + (d.nodeIndex * edgeSize) + nodeWidth / 2;
      //          },
      //          cy: setHeight / 2,
      //          r: 4,
      //          fill: function (d) {
      //            return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
      //          }
      //        });
      //
      //
      //      d3.select(this).selectAll("line")
      //        .data(function () {
      //          return d.setType.relIndices.map(function (index) {
      //            return {pathIndex: d.pathIndex, setTypeIndex: i, relIndex: index};
      //          });
      //        })
      //        .enter()
      //        .append("line")
      //        .attr({
      //          x1: function (d) {
      //            return nodeStart + (d.relIndex * nodeWidth) + (d.relIndex * edgeSize) + nodeWidth / 2;
      //          }
      //          ,
      //          y1: setHeight / 2,
      //          x2: function (d) {
      //            return nodeStart + ((d.relIndex + 1) * nodeWidth) + ((d.relIndex + 1) * edgeSize) + nodeWidth / 2;
      //          },
      //          y2: setHeight / 2,
      //          stroke: function (d) {
      //            return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
      //          }
      //        });
      //    }
      //  )
      //  ;
      //
      //
      //  setType.each(function (d, i) {
      //    var set = d3.select(this)
      //      .selectAll("g.set")
      //      .data(function () {
      //        return d.setType.sets.map(function (myset) {
      //          return {set: myset, pathIndex: d.pathIndex, setTypeIndex: i};
      //        });
      //      })
      //      .enter()
      //      .append("g")
      //      .classed("set", true)
      //      .attr({
      //        display: function (d) {
      //          if (d.set.canBeShown()) {
      //            return "inline";
      //          }
      //          return "none";
      //        },
      //        transform: getSetTransformFunction(that.pathWrappers)
      //      })
      //      .on("dblclick", function (d) {
      //        sortingManager.addOrReplace(sortingStrategies.getSetPresenceStrategy([d.set.id]));
      //        sortingManager.sort(that.pathWrappers, parent, "g.pathContainer", getPathContainerTransformFunction(that.pathWrappers));
      //      });
      //
      //    set.append("rect")
      //      .attr("class", "filler")
      //      .attr("x", 0)
      //      .attr("y", 0)
      //      .attr("width", "100%")
      //      .attr("height", setHeight)
      //
      //    set.append("text")
      //      .text(function (d) {
      //        //var text = d[0].id;
      //        //return getClampedText(text, 15);
      //
      //        var info = setInfo.get(d.set.id);
      //        if (typeof info === "undefined") {
      //          return d.set.id;
      //        }
      //        return info.properties["name"];
      //      })
      //      .attr("x", setTypeIndent)
      //      .attr("y", setHeight)
      //      .attr("fill", function (d) {
      //        return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
      //      })
      //      .attr("clip-path", "url(#SetLabelClipPath)");
      //
      //    set.append("title")
      //      .text(function (d) {
      //        var info = setInfo.get(d.set.id);
      //        if (typeof info === "undefined") {
      //          return d.set.id;
      //        }
      //        return info.properties["name"];
      //      });
      //
      //    set.each(function (d, i) {
      //      d3.select(this).selectAll("circle")
      //        .data(function () {
      //          return d.set.nodeIndices.map(function (index) {
      //            return {pathIndex: d.pathIndex, setTypeIndex: d.setTypeIndex, setIndex: i, nodeIndex: index};
      //          });
      //        })
      //        .enter()
      //        .append("circle")
      //        .attr({
      //          cx: function (d) {
      //            return nodeStart + (d.nodeIndex * nodeWidth) + (d.nodeIndex * edgeSize) + nodeWidth / 2;
      //          },
      //          cy: function (d) {
      //            return setHeight / 2;
      //          },
      //          r: 4,
      //          fill: function (d) {
      //            return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
      //          }
      //        })
      //    });
      //
      //
      //    set.each(function (d, i) {
      //
      //      d3.select(this).selectAll("line").
      //        data(function (d, i) {
      //          return d.set.relIndices.map(function (index) {
      //            return {pathIndex: d.pathIndex, setTypeIndex: d.setTypeIndex, setIndex: i, relIndex: index};
      //          });
      //        })
      //        .enter()
      //        .append("line")
      //        .attr("x1", function (d) {
      //          return nodeStart + (d.relIndex * nodeWidth) + (d.relIndex * edgeSize) + nodeWidth / 2;
      //        })
      //        .attr("y1", function (d) {
      //          return setHeight / 2;
      //          //return 2 * vSpacing + nodeHeight + (d.setIndex + 1) * setHeight - 5;
      //        })
      //        .attr("x2", function (d) {
      //          return nodeStart + ((d.relIndex + 1) * nodeWidth) + ((d.relIndex + 1) * edgeSize) + nodeWidth / 2;
      //        })
      //        .attr("y2", function (d) {
      //          return setHeight / 2;
      //          //return 2 * vSpacing + nodeHeight + (d.setIndex + 1) * setHeight - 5;
      //        })
      //        .attr("stroke", function (d) {
      //          return setInfo.getSetTypeInfo(that.pathWrappers[d.pathIndex].setTypes[d.setTypeIndex].type).color;
      //        });
      //
      //
      //    });
      //
      //
      //  });
      //
      //
      //  var l = selectionUtil.addDefaultListener(setType, "g.set", function (d) {
      //      return d.set.id;
      //    },
      //    "set"
      //  );
      //  selectionListeners.push(l);
      //
      //  //function getSetPositionY(pathIndex, setTypeIndex, setIndex) {
      //  //  var pathWrapper = that.pathWrappers[pathIndex];
      //  //
      //  //  var numSets = 0;
      //  //  for (var typeIndex = 0; typeIndex < setTypeIndex; typeIndex++) {
      //  //    var setType = pathWrapper.setTypes[typeIndex];
      //  //    numSets += setType.sets.length;
      //  //  }
      //  //
      //  //  return 2 * vSpacing + nodeHeight + (numSets + setIndex + setTypeIndex + 1) * setHeight;
      //  //}
      //
      //
      //}

    }


    return PathList;
  }
)
