define(['jquery', 'd3', '../view', './querymodel', '../pathsorting', '../listeners', '../listoverlay'], function ($, d3, View, q, pathSorting, listeners, ListOverlay) {

    var listOverlay = new ListOverlay();

    var DEFAULT_OVERLAY_BUTTON_SIZE = 16;
    var OR_BUTTON_WIDTH = 24;
    var AND_BUTTON_WIDTH = 38;
    var CAPTION_SIZE = 10;

    function addOverlayButton(parent, x, y, width, height, buttonText, textX, textY, color) {

      var button = d3.select("#queryOverlay").append("g")
        .classed("overlayButton", true)
        .attr({
          transform: "translate(" + (parent.translate.x) + "," + (parent.translate.y) + ")"
        });

      button.append("rect")
        .attr({
          x: x,
          y: y,
          width: width,
          height: height
        });

      button.append("text")
        .attr({
          x: textX,
          y: textY,
          fill: color
        })
        .text(buttonText);

      ;
      return button;
    }


    function addAddButton(parent, data, x, y) {

      var button = addOverlayButton(parent, x, y, DEFAULT_OVERLAY_BUTTON_SIZE, DEFAULT_OVERLAY_BUTTON_SIZE, "\uf067", x + DEFAULT_OVERLAY_BUTTON_SIZE / 2, y + DEFAULT_OVERLAY_BUTTON_SIZE - 1, "green");

      button.on("click", function () {
          listOverlay.show(d3.select("#queryOverlay"), data, parent.translate.x + x, parent.translate.y + y);
        }
      );
      return button;
    }

    function addAndButton(parent, data, x, y) {

      var button = addOverlayButton(parent, x, y, AND_BUTTON_WIDTH, DEFAULT_OVERLAY_BUTTON_SIZE, "AND", x + AND_BUTTON_WIDTH / 2, y + DEFAULT_OVERLAY_BUTTON_SIZE - 2, "orange");

      button.on("click", function () {
          listOverlay.show(d3.select("#queryOverlay"), data, parent.translate.x + x, parent.translate.y + y);
        }
      );
      return button;
    }

    function addOrButton(parent, data, x, y) {

      var button = addOverlayButton(parent, x, y, OR_BUTTON_WIDTH, DEFAULT_OVERLAY_BUTTON_SIZE, "OR", x + OR_BUTTON_WIDTH / 2, y + DEFAULT_OVERLAY_BUTTON_SIZE - 2, "lightblue");

      button.on("click", function () {
          listOverlay.show(d3.select("#queryOverlay"), data, parent.translate.x + x, parent.translate.y + y);
        }
      );
      return button;
    }

    function addRemoveButton(parent, x, y) {

      var button = addOverlayButton(parent, x, y, DEFAULT_OVERLAY_BUTTON_SIZE, DEFAULT_OVERLAY_BUTTON_SIZE, "\uf00d", x + DEFAULT_OVERLAY_BUTTON_SIZE / 2, y + DEFAULT_OVERLAY_BUTTON_SIZE - 3, "red");

      button.on("click", function () {
          parent.parent.removeChild(parent.parent.children.indexOf(parent));
          d3.select("#queryOverlay").selectAll("g.overlayButton")
            .remove();
        }
      );

      return button;
    }

    function replaceWithContainer(currentElement, ContainerConstructor, isContainerHorizontal, ElementConstructor) {
      var container = new ContainerConstructor(currentElement.parent, isContainerHorizontal);
      currentElement.parent.replace(currentElement, container);
      currentElement.parent = container;

      container.children.push(currentElement);
      $(container.childDomElements[0]).append($(currentElement.rootElement[0]));
      container.add(new ElementConstructor(container))
    }

    //-----------------------------------------

    function BaseGUIElement(parent) {
      this.parent = parent;
      this.translate = {x: 0, y: 0};
      this.fillHorizontal = true;
      this.fillVertical = true;
    }

    BaseGUIElement.prototype = {
      init: function (domParent) {
        var that = this;
        this.rootElement = domParent.append("g")
          .classed("queryElement", true);

        this.myDomElements = this.rootElement.append("g")
          .classed("myDomElements", true);

        $(this.myDomElements[0]).mouseenter(function () {
          if (that.showRemoveButton()) {
            var size = that.getSize();

            var button = addRemoveButton(that, size.width - DEFAULT_OVERLAY_BUTTON_SIZE, 0);

          }
        });

        $(this.myDomElements[0]).mouseleave(function () {
          if (!e) var e = window.event;
          var relTarg = e.relatedTarget || e.toElement;

          var classname = relTarg.parentNode.className

          if (classname.baseVal !== "overlayButton") {
            d3.select("#queryOverlay").selectAll("g.overlayButton")
              .remove();
          }
        });
      },

      getSize: function () {
        return {width: 80, height: 30};
      },
      update: function () {

      },

      updateParent: function () {
        var currentElement = this;
        while (typeof currentElement.parent != "undefined") {
          currentElement = currentElement.parent;
        }
        currentElement.update();
      },

      showRemoveButton: function () {
        return (typeof this.parent != "undefined");
      },

      getPathQuery: function () {
        return new q.PathQuery();
      },

      remove: function () {
        this.rootElement.remove();
      }
    };

    //------------------------------------------

    function ElementContainer(parent, horizontal) {
      BaseGUIElement.call(this, parent);
      this.children = [];
      this.horizontal = horizontal;
      this.hPadding = 5;
      this.vPadding = 5;
      this.elementSpacing = 5;
    }

    ElementContainer.prototype = Object.create(BaseGUIElement.prototype);

    ElementContainer.prototype.init = function (domParent) {
      BaseGUIElement.prototype.init.call(this, domParent);

      this.childDomElements = this.rootElement.append("g")
        .classed("childDomElements", true);


    },

      ElementContainer.prototype.add = function (childElement) {
        this.children.push(childElement);
        childElement.init(this.childDomElements);
        this.updateParent();
      };

    ElementContainer.prototype.insert = function (index, childElement) {
      this.children.splice(index, 0, childElement);
      childElement.init(this.childDomElements);
      this.updateParent();
    };

    ElementContainer.prototype.replace = function (child, newChild) {
      var index = this.children.indexOf(child);

      if (index !== -1) {

        this.children[index] = newChild;
        child.remove();
        newChild.init(this.childDomElements);
        this.updateParent();
      }
    };

    ElementContainer.prototype.removeChild = function (index) {
      var child = this.children[index];
      child.remove();
      this.children.splice(index, 1);
      this.updateParent();
    };

    ElementContainer.prototype.update = function () {
      this.updateMyDomElements();
      this.updateChildren(this.hPadding, this.vPadding);

    };

    ElementContainer.prototype.updateMyDomElements = function () {
    };

    ElementContainer.prototype.updateChildren = function (baseTranslateX, baseTranslateY) {

      var posX = baseTranslateX;
      var posY = baseTranslateY;
      var maxSize = 0;
      var that = this;

      this.children.forEach(function (child) {
        var childSize = child.getSize();
        if (that.horizontal) {
          if (childSize.height > maxSize) {
            maxSize = childSize.height;
          }
        } else {
          if (childSize.width > maxSize) {
            maxSize = childSize.width;
          }
        }
      });

      this.children.forEach(function (child) {
        var childSize = child.getSize();
        if (that.horizontal) {
          posY = baseTranslateY +(maxSize - childSize.height) / 2;
        } else {
          posX = baseTranslateX +(maxSize - childSize.width) / 2;
        }

        child.rootElement.attr("transform", "translate(" + posX + ", " + posY + ")");
        child.translate.x = that.translate.x + posX;
        child.translate.y = that.translate.y + posY;
        child.update();
        if (that.horizontal) {
          posX += childSize.width + that.elementSpacing;
        } else {
          posY += childSize.height + that.elementSpacing;
        }
      });
    };

    ElementContainer.prototype.getMinSize = function () {
      return {width: 80, height: 30};
    };

    ElementContainer.prototype.getSize = function () {

      var minSize = this.getMinSize();
      var childSize = this.calcChildSize();

      return {
        width: Math.max(childSize.width, minSize.width) + this.hPadding * 2,
        height: Math.max(childSize.height, minSize.height) + this.vPadding * 2
      };
    };

    ElementContainer.prototype.calcChildSize = function () {
      var width = this.horizontal ? Math.max(0, this.elementSpacing * (this.children.length - 1)) : 0;
      var height = !this.horizontal ? Math.max(0, this.elementSpacing * (this.children.length - 1)) : 0;
      var that = this;

      this.children.forEach(function (child) {
        var childSize = child.getSize();
        if (that.horizontal) {
          width += childSize.width;
          if (height < childSize.height) {
            height = childSize.height;
          }
        } else {
          height += childSize.height;
          if (width < childSize.width) {
            width = childSize.width;
          }
        }
      });

      return {width: width, height: height};
    };

    ElementContainer.prototype.getPathQuery = function () {
      if (this.children.length <= 0) {
        return new q.PathQuery();
      }
      return this.children[0].getPathQuery();
    };

    //--------------------------

    function BoxContainer(parent, fillColor, strokeColor, horizontal) {
      ElementContainer.call(this, parent, horizontal);
      this.fillColor = fillColor;
      this.strokeColor = strokeColor;
    }

    BoxContainer.prototype = Object.create(ElementContainer.prototype);

    BoxContainer.prototype.init = function (domParent) {
      ElementContainer.prototype.init.call(this, domParent);

      var size = this.getSize();

      this.myDomElements.append("rect")
        .classed("boxContainerBg", true)
        .attr({
          x: 0,
          y: 0,
          rx: 3,
          ry: 3,
          width: size.width,
          height: size.height,
          fill: this.fillColor,
          stroke: this.strokeColor
        });
    };

    BoxContainer.prototype.renderCaption = function (domParent) {
      this.myDomElements.append("text")
        .attr({
          x: 0,
          y: CAPTION_SIZE
        })
        .text(this.caption);
    };

    BoxContainer.prototype.updateMyDomElements = function () {
      ElementContainer.prototype.updateMyDomElements.call(this);

      var size = this.getSize();
      this.myDomElements.select("rect.boxContainerBg")
        .transition()
        .attr({
          width: size.width,
          height: size.height
        });
    };

    //------------------------------------------

    function CaptionContainer(parent, caption, fillColor, strokeColor, horizontal) {
      BoxContainer.call(this, parent, fillColor, strokeColor, horizontal);
      this.caption = caption;
    }

    CaptionContainer.prototype = Object.create(BoxContainer.prototype);

    CaptionContainer.prototype.init = function (domParent) {
      BoxContainer.prototype.init.call(this, domParent);

      var size = this.getSize();

      this.myDomElements.append("text")
        .attr({
          x: 2,
          y: CAPTION_SIZE
        })
        .text(this.caption);
    };

    CaptionContainer.prototype.update = function () {
      this.updateMyDomElements();
      this.updateChildren(this.hPadding, this.vPadding + CAPTION_SIZE);

    };

    CaptionContainer.prototype.getSize = function () {

      var minSize = this.getMinSize();
      var childSize = this.calcChildSize();

      return {
        width: Math.max(childSize.width, minSize.width) + this.hPadding * 2,
        height: Math.max(childSize.height, minSize.height) + this.vPadding * 2 + CAPTION_SIZE
      };
    };

    //-------------------------------------------

    function NodeConstraintElement(parent) {
      BaseGUIElement.call(this, parent);
    }

    NodeConstraintElement.prototype = Object.create(BaseGUIElement.prototype);

    NodeConstraintElement.prototype.addInput = function (domParent, initialText) {

      var size = this.getSize();

      domParent.append("rect")
        .attr({
          x: 0,
          y: 0,
          width: size.width,
          height: size.height,
          fill: "rgba(255,255,255,0.5)"
        });

      domParent.append("text")
        .attr({
          x: 5,
          y: 14
        }).text(initialText);

      domParent.append("foreignObject")
        .attr({
          x: 35,
          y: 2,
          width: 52,
          height: 20
        }).append("xhtml:div")
        .style("font", "10px 'Arial'")
        .html('<input type="text" placeholder="' + initialText + '" required="required" size="5px" width="5px" class="queryConstraint">');

      var that = this;

      $(domParent[0]).mouseenter(function () {
        var size = that.getSize();

        addAndButton(that, [{
          text: "Add Node Name", callback: function () {
            replaceWithContainer(that, AndContainer, true, NodeNameElement);
          }
        },
          {
            text: "Add Set", callback: function () {
            replaceWithContainer(that, AndContainer, true, NodeSetElement);
          }
          },
          {
            text: "Add Node Type", callback: function () {
            replaceWithContainer(that, AndContainer, true, NodeTypeElement);
          }
          }], size.width - AND_BUTTON_WIDTH, size.height - 5);

        addOrButton(that, [{
          text: "Add Node Name", callback: function () {
            replaceWithContainer(that, OrContainer, false, NodeNameElement);
          }
        },
          {
            text: "Add Set", callback: function () {
            replaceWithContainer(that, OrContainer, false, NodeSetElement);
          }
          },
          {
            text: "Add Node Type", callback: function () {
            replaceWithContainer(that, OrContainer, false, NodeTypeElement);
          }
          }], (size.width - OR_BUTTON_WIDTH) / 2, size.height - 5);


      });


      //$(domParent[0]).mouseleave(function () {
      //
      //  d3.select("#queryOverlay").selectAll("g.overlayButton")
      //    .remove();
      //});
    }

    NodeConstraintElement.prototype.getSize = function () {
      return {width: 92, height: 24};
    };

//----------------------------------------

    function NodeNameElement(parent) {
      NodeConstraintElement.call(this, parent);
    }

    NodeNameElement.prototype = Object.create(NodeConstraintElement.prototype);

    NodeNameElement.prototype.init = function (domParent) {
      NodeConstraintElement.prototype.init.call(this, domParent);

      this.addInput(this.myDomElements, "Name");
    };

    NodeNameElement.prototype.getPathQuery = function () {
      var el = this.myDomElements.select("input");
      var val = $(el[0]).val();

      return new q.NodeNameConstraint(val);
    };


//-----------------------------------

    function NodeSetElement(parent) {
      NodeConstraintElement.call(this, parent);
    }

    NodeSetElement.prototype = Object.create(NodeConstraintElement.prototype);

    NodeSetElement.prototype.init = function (domParent) {
      NodeConstraintElement.prototype.init.call(this, domParent);

      this.addInput(this.myDomElements, "Set");
    };

    NodeSetElement.prototype.getPathQuery = function () {
      var el = this.myDomElements.select("input");
      var val = $(el[0]).val();

      return new q.NodeSetPresenceConstraint(val);
    };

//-----------------------------------

    function NodeTypeElement(parent) {
      NodeConstraintElement.call(this, parent);

    }

    NodeTypeElement.prototype = Object.create(NodeConstraintElement.prototype);

    NodeTypeElement.prototype.init = function (domParent) {
      NodeConstraintElement.prototype.init.call(this, domParent);

      this.addInput(this.myDomElements, "Type");
    };

    NodeTypeElement.prototype.getPathQuery = function () {
      var el = this.myDomElements.select("input");
      var val = $(el[0]).val();

      return new q.NodeTypeConstraint(val);
    };

//--------------------------------------

    function AndContainer(parent, horizontal) {
      CaptionContainer.call(this, parent, "AND", "#fed9a6", "black", horizontal || false);
      //ElementContainer.call(this, parent, horizontal || false);
      //this.vPadding = 0;
    }

    AndContainer.prototype = Object.create(CaptionContainer.prototype);

    AndContainer.prototype.getMinSize = function () {
      return {width: 40, height: 20};
    };

    AndContainer.prototype.getPathQuery = function () {
      if (this.children.length == 0) {
        return new q.And(new q.PathQuery(), new q.PathQuery());
      } else if (this.children.length == 1) {
        return new q.And(this.children[0].getPathQuery(), new q.PathQuery());
      }
      return new q.And(this.children[0].getPathQuery(), this.children[1].getPathQuery());
    };


    //--------------------------

    function OrContainer(parent, horizontal) {
      CaptionContainer.call(this, parent, "OR", "#b3cde3", "black", horizontal || false);
      //ElementContainer.call(this, parent, horizontal || false);
      //this.vPadding = 0;
    }

    OrContainer.prototype = Object.create(CaptionContainer.prototype);


    OrContainer.prototype.getMinSize = function () {
      return {width: 40, height: 20};
    };

    OrContainer.prototype.getPathQuery = function () {
      if (this.children.length == 0) {
        return new q.Or(new q.PathQuery(), new q.PathQuery());
      } else if (this.children.length == 1) {
        return new q.Or(this.children[0].getPathQuery(), new q.PathQuery());
      }
      return new q.Or(this.children[0].getPathQuery(), this.children[1].getPathQuery());
    };


//------------------------------------------------------
    function NodeContainer(parent) {
      BoxContainer.call(this, parent, "rgb(200, 200, 200)", "rgb(30, 30, 30)", false);
    }

    NodeContainer.prototype = Object.create(BoxContainer.prototype);

    NodeContainer.prototype.init = function (domParent) {
      BoxContainer.prototype.init.call(this, domParent);

      var that = this;


      //Use jquery mouseenter and mouseleave to prevent flickering of add button
      $(this.myDomElements[0]).mouseenter(function () {
        var size = that.getSize();
        if (that.children.length <= 0) {

          addAddButton(that, [{
            text: "Add Node Name", callback: function () {
              that.add(new NodeNameElement(that));
              d3.select(this).remove();
            }
          },
            {
              text: "Add Set", callback: function () {
              that.add(new NodeSetElement(that));
              d3.select(this).remove();
            }
            },
            {
              text: "Add Node Type", callback: function () {
              that.add(new NodeTypeElement(that));
              d3.select(this).remove();
            }
            }], (size.width - DEFAULT_OVERLAY_BUTTON_SIZE) / 2, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);

        }

        addAddButton(that, [{
          text: "Add Node", callback: function () {
            var index = that.parent.children.indexOf(that);
            that.parent.insert(index + 1, new NodeContainer(that.parent));
            if (that.parent instanceof SequenceContainer) {
              that.parent.insert(index + 1, new SequenceFiller(that.parent));
            }
          }
        }, {
          text: "Add Edge", callback: function () {
            var index = that.parent.children.indexOf(that);

            if (that.parent instanceof SequenceContainer) {
              if (index < that.parent.children.length - 1) {
                var nextChild = that.parent.children[index + 1];
                if (!(nextChild instanceof SequenceFiller)) {
                  that.parent.insert(index + 1, new SequenceFiller(that.parent));
                }
              }
            }
            that.parent.insert(index + 1, new EdgeContainer(that.parent));
          }
        }], size.width - DEFAULT_OVERLAY_BUTTON_SIZE, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);
      });


    };

    NodeContainer.prototype.getPathQuery = function () {
      if (this.children.length == 0) {
        return new q.NodeMatcher(new q.Constraint());
      }
      return new q.NodeMatcher(this.children[0].getPathQuery());
    };

    //---------------------------------------------

    function EdgeContainer(parent) {
      BoxContainer.call(this, parent, "white", "black", true);
    }

    EdgeContainer.prototype = Object.create(BoxContainer.prototype);

    EdgeContainer.prototype.init = function (domParent) {
      BoxContainer.prototype.init.call(this, domParent);

      var that = this;

      var size = this.getSize();

      this.myDomElements.append("line")
        .classed("edgeLine", true)
        .attr({
          x1: 5,
          y1: size.height / 2,
          x2: size.width - 5,
          y2: size.height / 2,
          "stroke-width": "5px",
          stroke: "black"
        });

      $(this.myDomElements[0]).mouseenter(function () {

        var size = that.getSize();

        addAddButton(that, [{
          text: "Add Node", callback: function () {
            var index = that.parent.children.indexOf(that);

            if (that.parent instanceof SequenceContainer) {
              if (index < that.parent.children.length - 1) {
                var nextChild = that.parent.children[index + 1];
                if (!(nextChild instanceof SequenceFiller)) {
                  that.parent.insert(index + 1, new SequenceFiller(that.parent));
                }
              }
            }
            that.parent.insert(index + 1, new NodeContainer(that.parent));
          }
        }, {
          text: "Add Edge", callback: function () {
            var index = that.parent.children.indexOf(that);

            that.parent.insert(index + 1, new EdgeContainer(that.parent));
            if (that.parent instanceof SequenceContainer) {
              that.parent.insert(index + 1, new SequenceFiller(that.parent));
            }
          }
        }], size.width - DEFAULT_OVERLAY_BUTTON_SIZE, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);

      });

      //$(this.myDomElements[0]).mouseleave(function () {
      //  d3.select("#queryOverlay").selectAll("g.overlayButton")
      //    .remove();
      //});
    };

    EdgeContainer.prototype.update = function () {
      BoxContainer.prototype.update.call(this);

      var size = this.getSize();
      this.myDomElements.selectAll("line.edgeLine")
        .transition()
        .attr({
          x1: 5,
          y1: size.height / 2,
          x2: size.width - 5,
          y2: size.height / 2
        });
    };

    EdgeContainer.prototype.getPathQuery = function () {
      if (this.children.length == 0) {
        return new q.EdgeMatcher(new q.Constraint());
      }
      return new q.EdgeMatcher(this.children[0].getPathQuery());
    };

    //---------------------------------------------

    function UnorderedContainer(parent) {
      CaptionContainer.call(this, parent, "Unordered", "#ccebc5", "black", true);
    }

    UnorderedContainer.prototype = Object.create(CaptionContainer.prototype);

    UnorderedContainer.prototype.init = function (domParent) {
      CaptionContainer.prototype.init.call(this, domParent);

      var that = this;

      $(this.myDomElements[0]).mouseenter(function () {

        var size = that.getSize();

        if (that.children.length <= 0) {
          addAddButton(that, [{
            text: "Add Node", callback: function () {
              that.add(new NodeContainer(that));
            }
          }, {
            text: "Add Edge", callback: function () {
              that.add(new EdgeContainer(that));
            }
          }], (size.width - DEFAULT_OVERLAY_BUTTON_SIZE) / 2, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);
        }

      });

    };

    UnorderedContainer.prototype.getPathQuery = function () {
      if (this.children.length == 0) {
        return new q.PathQuery();
      }

      var prevQuery = 0;

      this.children.forEach(function (child) {
        var currentQuery = child.getPathQuery();
        if (prevQuery != 0) {
          prevQuery = new q.And(prevQuery, currentQuery);
        } else {
          prevQuery = currentQuery;
        }
      })

      return prevQuery;
    };

    //--------------------------------


    function SequenceFiller(parent) {
      BaseGUIElement.call(this, parent, true);
    }

    SequenceFiller.prototype = Object.create(BaseGUIElement.prototype);

    SequenceFiller.prototype.init = function (domParent) {
      BaseGUIElement.prototype.init.call(this, domParent);

      var size = this.getSize();

      this.myDomElements.append("rect")
        .attr({
          x: 0,
          y: 0,
          width: size.width,
          height: size.height,
          fill: "white"
        });

      this.myDomElements.append("line")
        .attr({
          x1: 5,
          y1: size.height / 2,
          x2: size.width - 5,
          y2: size.height / 2,
          "stroke-width": "5px",
          "stroke-linecap": "round",
          "stroke-dasharray": "1, 20",
          stroke: "black"
        });

      var that = this;

      //Use jquery mouseenter and mouseleave to prevent flickering of add button
      $(this.myDomElements[0]).mouseenter(function () {
        var size = that.getSize();

        addAddButton(that, [{
          text: "Add Node", callback: function () {
            var index = that.parent.children.indexOf(that);

            if (index > 0 && index < that.parent.children.length - 1) {
              var prevChild = that.parent.children[index - 1];
              var nextChild = that.parent.children[index + 1];
              if (prevChild instanceof EdgeContainer && nextChild instanceof EdgeContainer) {
                that.parent.replace(that, new NodeContainer(that.parent));
                return;
              }
            }

            that.parent.insert(index, new NodeContainer(that.parent));
            that.parent.insert(index, new SequenceFiller(that.parent));
          }
        }, {
          text: "Add Edge", callback: function () {
            var index = that.parent.children.indexOf(that);

            if (index > 0 && index < that.parent.children.length - 1) {
              var prevChild = that.parent.children[index - 1];
              var nextChild = that.parent.children[index + 1];
              if (prevChild instanceof NodeContainer && nextChild instanceof NodeContainer) {
                that.parent.replace(that, new EdgeContainer(that.parent));
                return;
              }
            }

            that.parent.insert(index, new EdgeContainer(that.parent));
            that.parent.insert(index, new SequenceFiller(that.parent));
          }
        }], (size.width - DEFAULT_OVERLAY_BUTTON_SIZE) / 2, (size.height - DEFAULT_OVERLAY_BUTTON_SIZE) / 2);

      });

      //$(this.rootElement[0]).mouseleave(function () {
      //  d3.select("#queryOverlay").selectAll("g.overlayButton")
      //    .remove();
      //});
    };

    SequenceFiller.prototype.showRemoveButton = function () {
      var show = BaseGUIElement.prototype.showRemoveButton.call(this)
      if (show) {
        var index = this.parent.children.indexOf(this);
        if (index > 0 && index < this.parent.children.length - 1) {
          var prevChild = this.parent.children[index - 1];
          var nextChild = this.parent.children[index + 1];
          if ((prevChild instanceof EdgeContainer && nextChild instanceof EdgeContainer) ||
            (prevChild instanceof NodeContainer && nextChild instanceof NodeContainer)) {
            return false;
          }
        }
      }
      return show;
    };

    //--------------------------------------

    function SequenceContainer(parent) {
      CaptionContainer.call(this, parent, "Sequence", "white", "black", true);
    }


    SequenceContainer.prototype = Object.create(CaptionContainer.prototype);

    SequenceContainer.prototype.init = function (parent) {
      CaptionContainer.prototype.init.call(this, parent);


      this.add(new NodeContainer(this));
      this.add(new SequenceFiller(this));
      this.add(new NodeContainer(this));

      var that = this;

      $(this.myDomElements[0]).mouseenter(function () {
        var size = that.getSize();

        addAndButton(that, [{
          text: "Add Unordered", callback: function () {
            replaceWithContainer(that, AndContainer, false, UnorderedContainer);
          }
        }], size.width - AND_BUTTON_WIDTH, size.height - 5);

        addOrButton(that, [{
          text: "Add Unordered", callback: function () {
            replaceWithContainer(that, OrContainer, false, UnorderedContainer);
          }
        },
          {
            text: "Add Sequence", callback: function () {
            replaceWithContainer(that, OrContainer, false, SequenceContainer);
          }
          }], (size.width - OR_BUTTON_WIDTH) / 2, size.height - 5);

      });
    };

    SequenceContainer.prototype.update = function () {

      var sequenceOk = false;

      while (!sequenceOk) {
        var prevChild = 0;
        sequenceOk = true;
        for (var i = 0; i < this.children.length; i++) {
          var child = this.children[i];
          if (prevChild != 0) {
            if ((prevChild instanceof EdgeContainer && child instanceof EdgeContainer) ||
              (prevChild instanceof NodeContainer && child instanceof NodeContainer)) {
              this.insert(i, new SequenceFiller(this));
              sequenceOk = false;
              break;
            }

            if ((prevChild instanceof SequenceFiller && child instanceof SequenceFiller)) {
              this.removeChild(i);
              sequenceOk = false;
              break;
            }
          }
          prevChild = child;
        }
      }

      CaptionContainer.prototype.update.call(this);
    }
    ;

    SequenceContainer.prototype.getPathQuery = function () {
      if (this.children.length === 0) {
        return new g.PathQuery();
      } else if (this.children.length === 1) {
        return this.children[0].getPathQuery();
      }

      var prevQuery = 0;
      var prevChild = 0;

      for (var i = 0; i < this.children.length; i++) {
        var child = this.children[i];
        if (!(child instanceof SequenceFiller)) {
          var currentQuery = child.getPathQuery();

          if (prevQuery != 0) {

            if (prevChild instanceof SequenceFiller) {
              prevQuery = new q.QueryMatchRegionRelation(prevQuery, currentQuery, q.MatchRegionRelations.greater);
            } else {
              if (prevChild instanceof NodeContainer && child instanceof EdgeContainer) {
                prevQuery = new q.QueryMatchRegionRelation(prevQuery, currentQuery, q.MatchRegionRelations.max1EqualsMin2);
              } else {
                prevQuery = new q.QueryMatchRegionRelation(prevQuery, currentQuery, q.MatchRegionRelations.subsequent);
              }
            }
          } else {
            prevQuery = currentQuery;
          }
        }

        prevChild = child;

      }

      return prevQuery;
    };


    //----------------------

    function QueryView(selector) {
      View.call(this, selector);
      this.grabHSpace = false;
      this.grabVSpace = false;
    }

    QueryView.prototype = Object.create(View.prototype);

    QueryView.prototype.getMinSize = function () {
      return {width: "100%", height: 400};
    };

    QueryView.prototype.init = function () {
      View.prototype.init.call(this);
      var svg = d3.select(this.parentSelector + " svg");
      d3.select(this.parentSelector).append("button")
        .text("Update")
        .on("click", function () {
          var pathQuery = container.getPathQuery();
          pathSorting.sortingManager.addOrReplace(pathSorting.sortingStrategies.getPathQueryStrategy(pathQuery));
          listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
          listeners.notify(listeners.updateType.QUERY_UPDATE, pathQuery);
        });

      var container = new ElementContainer();
      container.init(svg);
      container.add(new SequenceContainer(container));

      svg.append("g")
        .attr("id", "queryOverlay")
    };

    return QueryView;

  }
)
;