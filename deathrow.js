// Texas Deathrow Visualization
// Joe Nudell, 2013
;

// Namespacing
var jn = jn || {};
jn.deathrow = {};
jn.deathrow.live = {};



jn.deathrow.Dashboard = function(config, noInit) {
    var that = this;

    if(typeof config==='boolean' && noInit===undefined) {
        // Alternate calling scheme: function(noInit)
        noInit = config;
        config = {};
    }

    if(config===undefined && noInit===undefined) {
        // Alternate calling scheme: function()
        // By default, init now, not later (noInit = false)
        noInit = false;
        config = {};
    }

    if(config===undefined) {
        config = {};
    }

    // Extend configuration
    this.chartConfig = $.extend(true, {}, this.defaultChartConfig, config);

    // Update bar chart domains
    for(var key in this.chartConfig.bins) {
        var bins = this.chartConfig.bins[key],
            domain = [
                -2.5,
                bins.length-.5
            ],
            binLabels = ['Not Available'];

        this.chartConfig.dimension[key] = this.chartConfig.dimension[key] ||{};
        this.chartConfig.dimension[key].x = d3.scale.linear().domain(domain);

        // Create binLabels -- labels for xAxis
        for(var i=-1; i<bins.length; i++) {
            if(i<0) { 
                binLabels.push("< "+ bins[0]);
            }else if(i==bins.length-1){
                binLabels.push("> "+ bins[i]);
            }else{
                binLabels.push(bins[i] +" - "+ bins[i+1]);
            }
        }

        // Set xAxis tick format to map to binLabels
        this.chartConfig.dimension[key]._xTickFormat = (function(key, bl){
            return function() {
                this.xAxis().tickFormat(function(v) {
                    return bl[v+2];
                });
            };
        })(key, $.extend([], binLabels));
    }


    // Load data (async)
    this.loadData(function() {
        if(!noInit) {
            that.init();
        }
    });

};


jn.deathrow.Dashboard.prototype = {
    chartSelector : '.chart',
    dataSource : 'deathrow.csv',
    //
    defaultChartConfig : {
        // Default configurations for specific charts
        general : {
            transitionDuration : 500,
            _onPostRender : function(glob) {
                var that = glob;
                this.on('postRedraw', function(chart) {
                    // Clean up any stray tags in the control panel
                    var chartName = chart.anchor().substring(1),
                        changed = false,
                        filters = chart.filters();

                    $("#current-filters div[data-target='"+chartName+"']")
                        .each(function() {
                        if($("#"+chartName).attr('data-type')=='barChart') {
                            // Only exit if there really aren't any filters
                            // on the bar chart
                            if(!filters||!filters.length) {
                                $(this).addClass('exit');
                                changed = true;
                            }
                        }else{
                            // Remove element if it's not an active filter
                            var text = $(this).text();
                            if(filters.indexOf(text)<0) {
                                $(this).addClass('exit');
                                changed = true;
                            }
                        }
                    });

                    if(changed) {
                        $('#current-filters .exit').remove();

                        $.event.trigger({
                            type: "chartFiltered",
                            chart: chartName,
                            filter: null
                        });
                    }
                });
            },
            _onFiltered : function(glob) {
                var that = glob;
                this.on('filtered', function(chart, filter) {
                    var chartName = chart.anchor().substring(1),
                        _fLabel = "<div class='filter-label' data-target='{target}'><i class='icon-remove'></i><span class='filter-text'>{filter}</span></div>",
                        $cont = $('#current-filters'),
                        activeFilters = chart.filters(),
                        sel = "#current-filters div[data-target='"+chartName+"']",
                        $cls = $(sel),
                        _type = $('#'+chartName).attr('data-type');

                    if(_type=='barChart') {
                        // Bar charts can't have multiple filters (unions),
                        // so only one label can ever be present.
                        // Todo: break this out into reusable code for all
                        // non-unionable charts
                        // Filters need to be binned to make sense
                        filter = jn.deathrow.histogramFilterLabel(
                            filter,
                            chartName,
                            that.chartConfig.bins[chartName]
                        );

                        if(filter) {
                            if(!$cls.length) {
                                // No label for this chart exists, so make one
                                var _n = $(_fLabel
                                    .replace('{target}', chartName)
                                    .replace('{filter}', filter))
                                .click(function(e){
                                    // Add event to current label. It's click
                                    // behavior results in a rest of the chart.
                                    chart.filter(null);
                                    dc.redrawAll();
                                    e.preventDefault();
                                    return false;
                                }).appendTo($cont);
                            }else{
                                // Filter exists, so update its value
                                $cls.find('.filter-text').html(filter);
                            }
                        }
                    }else{
                        // For charts that can have multiple filters (unions)

                        var $spec = $(sel+":contains("+filter+")");

                        if(filter===null) {
                            // reset -- remove all filters
                            $cls.addClass('exit');
                            $cls.remove();
                        }else if ($spec.length && filter){
                            // There is a label currently representing this target
                            // Remove it.
                            $spec.addClass('exit');
                            $spec.remove();
                        }else{
                            // There is no label currently representing this filter
                            var n = $(_fLabel
                                .replace('{target}', chartName)
                                .replace('{filter}', filter))
                            .click(function(e){
                                // Make sure all current labels have events
                                chart.filter($(this).text());
                                dc.redrawAll();
                                e.preventDefault();
                                return false;
                            }).appendTo($cont);
                        }
                    }

                    // Bubble up event so Davis can preserve state
                    $.event.trigger({
                        type: "chartFiltered",
                        chart: chartName,
                        filter: filter
                    });
                });
            },
            colors: ["#272F30", "#36630C", "#9E2B20", "#E0401C", "#E6B051"]
        },
        bins : {
            education : [0, 6, 8, 9, 10, 11, 12],
            age : [0, 18, 21, 25, 30, 40, 50]
        },
        dimension : {},
        id : {
            age : {
                width: 500
            },
            education: {
                width: 500
            },
            occupation: {
                size: [500, 200],
                valueAccessor: function(d) {
                    return d['Occupation'];
                },
                splitAt : /[,\/]+/g,
                normalize : function(d) {
                    if(/unemployed/gi.test(d)) {
                        return "Unemployed";
                    }
                    return d.replace(/\s+/g,' ').trim();
                }
            },
            statement: {
                size: [500, 400],
                valueAccessor: function(d) {
                    return d['Statement'];
                },
                normalize : function(d) {
                    return d.trim();
                },
                scale: d3.scale.log().range([10, 30])
            },
            numberTable: {
                size: Infinity,
                columns: [
                    function(d) {
                        var a = "<a href='"+d['Source of Statement']+"' target='_blank'>"+d['Prisoner']+"</a>"
                        return a;
                    },
                    function(d) { return d['Execution Date']; },
                    function(d) { return d['Statement']; },
                    function(d) {
                        var t = Math.round(100*(+d['Sentiment']));
                        if(!isNaN(t)){
                            var hScore = (2*t)-100;
                            return hScore>0? "+"+hScore : hScore;
                        }else{
                            return 'N/A';
                        }
                    }
                ],
                sortBy: function(d) { return d['Prisoner']; },
                order: d3.ascending,
                width: 500
            },
            fullDataTable: {
                size: Infinity,
                columns: [
                    function(d) { 
                        var a = "<a href='"+d['Source of Bio']+"' target='_blank'>"+d['Prisoner']+"</a>"
                        return a;
                    },
                    function(d) { return d['First Name']; },
                    function(d) { return d['Last Name']; },
                    function(d) { return d['Race']; },
                    function(d) { return d['Gender']; },
                    function(d) { return d['Education']; },
                    function(d) { return d['Occupation']; },
                    function(d) { return d['Age of Incarceration']; },
                    function(d) { return d['Age when Executed']; }
                ],
                sortBy: function(d) { return d['Prisoner']; },
                order: d3.ascending,
                width: 1000
            }
        },
        type : {
            barChart : {
                elasticY : true,
                renderTitle: true,
                centerBar: true,
                margins : {top:10, right:50, bottom:30, left:40}
            },
            pieChart : {
                radius : 90,
                innerRadius : 10
            },
            wordCloud : {
                font : "Oswald"
            }
        },
        group : {}
    },
    //
    // Some containers
    charts : {},
    cache : {},
    group : {},
    dim : {},
    data : [],
    cf: null,
    //
    _applyConfig : function(arr, id) {
        // Apply custom / special configurations to charts
        if(typeof arr!=='object') return;
        for(var key in arr) {
            if(key.substring(0,1)=="_") {
                // Execute supplied function
                arr[key].call(this.charts[id], this);
            }else{
                // Set property of chart with supplied k-v pair
                var fn = this.charts[id][key] || function(){},
                    p = arr[key];
                if(typeof p==='object' && p.args!==undefined) {
                    fn.apply(null, p.args);
                }else{
                    fn(p);
                }
            }
        }
    }
};


jn.deathrow.Dashboard.prototype.loadData = function(source, callback) {
    var that = this;
    // Load data from server with callback
    if(typeof source==='function' && callback===undefined) {
        // Alternate calling scheme: function(callback){}
        // Uses default datasource specified in instance
        callback = source;
        source = this.dataSource
    }

    // Source data should be csv
    d3.csv(source, function(data) {
        // Process returned data
        var cf;
        that.data = data;
        that.cf = cf = crossfilter(data);


        var _isDataAvailable = function(d) {
            // Use gender info as proxy for bio data availability
            var na = /not available/ig
            return !(na.test(d['Gender']));
        };


        // Make dimensions and groups with crossfiltered data
        // - "ALL" group
        that.dim.all = cf;
        that.group.all = cf.groupAll();

        // Mirror data available for data counting purposes
        that.dim._cf2 = crossfilter(data);
        that.group._cf2 = that.dim._cf2.groupAll();
        that.dim.allUsed = that.dim._cf2.dimension(_isDataAvailable);
        that.group.allUsed = that.dim.allUsed.group();

        // - "Data Available" Dimension / group
        that.dim.available = cf.dimension(_isDataAvailable);
        that.group.available = that.dim.available.group();


        // - Race
        that.dim.race = cf.dimension(function(d) {
            return d['Race'];
        });
        that.group.race = that.dim.race.group();

        // - Sentiment
        that.dim.sentiment = cf.dimension(function(d) {
            return +d['Sentiment'];
        });
        that.group.sentiment = that.dim.sentiment.group();

        // - Gender
        that.dim.gender = cf.dimension(function(d) {
            return d['Gender'];
        });
        that.group.gender = that.dim.gender.group();


        // - Education
        that.dim.education = cf.dimension(function(d) {
            var edu = d['Education'],
                bins = that.chartConfig.bins.education || [0, 12];

            // Create histogram
            return jn.deathrow.bin(edu, bins);
        });
        that.group.education = that.dim.education.group();
        

        // - Age
        that.dim.age = cf.dimension(function(d) {
            var age = d['Age of Incarceration'],
                bins = that.chartConfig.bins.age;

            // Create histogram
            return jn.deathrow.bin(age, bins);
        });
        that.group.age = that.dim.age.group();


        // - Occupation
        that.dim.occupation = cf.dimension(function(d) {
            return d['Occupation'];
        });
        that.group.occupation = that.dim.occupation.group();


        // - Last Statement
        that.dim.statement = cf.dimension(function(d) {
            var s = d['Statement'];
            if(!/declined to/i.test(s)) {
                return s;
            }
            return "";
        });
        that.group.statement = that.dim.statement.group();


        // - Prisoner Number
        that.dim.prisoner = cf.dimension(function(d) {
            return parseInt(d['Prisoner']);
        });
        that.group.prisoner = that.dim.prisoner.group();
        that.group.prisonerData = function(d) {
            return "Last Statements"
        };

        // -- End of Dimensions & Groups -- //

        // Finished. Execute callback if available.
        if(callback!==undefined) {
            callback();
        }
    });
};


jn.deathrow.Dashboard.prototype.init = function() {
    var that = this,
        _chartsInvoked = 0,
        _chartsRendered = 0;

    // Gather charts from dom
    $(this.chartSelector).each(function() {
        // Cache info about chart spec from DOM attributes
        var $this = $(this),
            id = $this.attr('id'),
            type = $this.attr('data-type'),
            dimension = $this.attr('data-dimension'),
            dim = that.dim[dimension],
            group = $this.attr('data-group');

        if(typeof dc[type]!=='function') {
            // Check validity of given chart type
            throw "Illegal chart type ("+type+")";
            return;
        }

        // Create Chart
        that.charts[id] = dc[type]('#'+id).dimension(dim);

        // Count how many charts have been invoked / rendered
        _chartsInvoked++;
        that.charts[id].on('postRender', function() {
            _chartsRendered++;
            if(_chartsRendered==_chartsInvoked) {
                _chartsRendered = 0;
                $.event.trigger({
                    type: 'allChartsRendered'
                });
            }
        });

        // Apply default configuration to chart
        that._applyConfig(that.chartConfig.general, id);

        // Apply specific configurations to chart
        // ... by Dimension
        that._applyConfig(that.chartConfig.dimension[dimension], id);
        // ... by Type
        that._applyConfig(that.chartConfig.type[type], id);
        // ... by Group
        that._applyConfig(that.chartConfig.group[group], id);
        // ... by ID
        that._applyConfig(that.chartConfig.id[id], id);

        // Set group for filtering, if applicable
        if(group) {
            that.charts[id].group(that.group[group]);
        }

        // Configure reset button
        var reset = $this.find('a.reset');
        if(reset.length) {
            reset.click(function() {
                // Clear current chart and redraw everything
                that.charts[id].filterAll();
                dc.redrawAll();
                return false;
            });
        }
    }); // End of DOM .charts traversal
    
    // Render every chart
    dc.renderAll();

    // Make table headers
    $('.dc-chart[data-type="dataTable"]').each(function() {
        var $table = $(this),
            $header = $table.find('.header');

        if($header.length) {
            var $thead = $('<thead><tr></tr></thead>')
                .insertBefore($table.find('tbody')),
                $thr = $table.find('thead>tr');

            $header.find('span').each(function() {
                var $this = $(this);
                $thr.append('<th>'+ $this.html() +'</th>');
                $this.remove();
            }).remove();
        }

    });

    // Hook into dataTable and adjust denominator
    this.charts['dataCount'].on('postRedraw', function(chart) {
        var size = that.group._cf2.value();
        $('#dataCount .total-count').html(size);

        // Adjust value of descriptive statistics displayed on page
        // -- average sentiment
        var sentGroup = that.dim.sentiment.groupAll(),
            sentCount = sentGroup.reduceCount(function(d) {
                var s = +d['Sentiment'];
                return isNaN(s)? 0 : 1;
            }).value(),
            sentSum = sentGroup.reduceSum(function(d) {
                var s = +d['Sentiment'];
                return isNaN(s)? 0 : s;
            }).value(),
            sentAvg = sentSum / sentCount,
            hScore = (2*Math.round(sentAvg*100))-100;

        $('#sentAvg .avg').html(hScore>0?"+"+hScore:hScore);
        $('#sentAvg #indicator').indicator('value', sentAvg);
    });


    $('#sentAvg #indicator').indicator();

};




jn.deathrow.Dashboard.prototype.scrollToScene = function(scene,from,callback) {
    if(jn.deathrow.live._suspended) {
        // disable scrolling in smaller site until it works right
        if(typeof callback=='function') { 
            callback();
            return;
        }
    }

    var that = this,
        duration = 500,
        scenes = $('.page').toArray(),
        sceneIds = scenes.map(function(me) {
            return $(me).attr('id');
        }),
        nextScene = sceneIds.indexOf(scene),
        curScene = sceneIds.indexOf(from),
        reverse = nextScene<curScene,
        calledBack = false;

    if(nextScene==curScene) {
        // No need to scroll to scene
        if(typeof callback=='function') {
            callback();
        }
        return;
    }
    
    if(this.cache.scrollPos===undefined) {
        // Build and cache scroll target map
        this.cache.scrollPos = [0];
        this.cache.scrollTargets = {
            '__page__' : {top: 0}
        };

        var offset = 0;
        $('.page').each(function() {
            var $this = $(this),
                id = $this.attr('id');

            that.cache.scrollTargets[id] = {top: offset};

            offset += +$this.attr('data-duration');
            that.cache.scrollPos.push(offset);
            that.cache.scrollTargets[id].bottom = offset;

            offset += $this.height();
            that.cache.scrollPos.push(offset);
        });

        this.cache.scrollTargets['__page__'].bottom = offset;
    }

    // Set up offset scroll sequence
    var curOffset = $(window).scrollTop(),
        offsets = [],
        start = false,
        scrollTargets = jn.deathrow.live._suspended?
            this.cache.staticScrollTargets : this.cache.scrollTargets,
        endAtPos = scrollTargets[scene].top,
        pos = $.extend([], this.cache.scrollPos);

    if(reverse) {
        var _t = endAtPos;
        endAtPos = curOffset;
        curOffset = scrollTargets[scene].bottom - $('#'+scene).height();
    }

    for(var i=0; i<pos.length; i++) {
        // Build scroll offset sequence from targets
        if(!start) {
            // Find next largest target
            if(curOffset<=pos[i]) {
                offsets.push(pos[i]);
                start = true;
            }
        }else{
            // Append targets below end position
            if(pos[i]<endAtPos) {
                offsets.push(pos[i]);
            }else{
                offsets.push(endAtPos);
                break;
            }
        }
    }

    // Have to overshoot destination in order to trigger Router.
    // Todo: look for a neater solution
    if(reverse) {
        offsets.reverse();
        offsets.push(curOffset-10, curOffset);
    }else{
        offsets.push(endAtPos+10, endAtPos);
    }

    (function _scroller(offsets, n) {
        if(n===0) {
            if(typeof callback=='function' && !calledBack){
                calledBack = true;
                callback();
            }
            return;
        }

        // Do scrolling - to end of Duration
        $('html, body').animate({
                scrollTop: offsets.shift()
            },
            duration,
            'swing',
            function _recurse() {
                _scroller(offsets, offsets.length);
            }
        );
    })(offsets);
};

jn.deathrow.Dashboard.prototype.scrollToFrame = function(scene,frame,callback){
    if(jn.deathrow.live._suspended) {
        // disable scrolling in smaller site until it works right
        if(typeof callback=='function') { 
            callback();
            return;
        }
    }

    // Scroll to a specific frame. Should only fire *after* scene is loaded.
    var that = this,
        scrollDur = 500,
        frame = (!frame||frame<0)? 0 : frame,
        $scene = $('#'+scene),
        scrollTargets = jn.deathrow.live._suspended?
            this.cache.staticScrollTargets : this.cache.scrollTargets,
        top = scrollTargets[scene].top,
        bottom = scrollTargets[scene].bottom,
        dur = bottom - top,
        frames = $scene.find('.subpage').length,
        pct = frame / (frames-1),
        scrollTarget = (.95*pct*dur)+top,
        calledBack = false;

    $('html, body').animate({
            scrollTop: scrollTarget
        },
        scrollDur,
        'swing',
        function _complete() {
            if(typeof callback=='function' && !calledBack) {
                calledBack = true;
                callback();
            }
        }
    );
};

jn.deathrow.Dashboard.prototype.applyFilters = function(arg1, arg2) {
    var that = this,
        _applyFilter = function(t, v) {
            var _f = {};

            if(that.charts[t]) {
                _f = that.charts[t];
            }else if(that.dim[t]) {
                _f = that.dim[t];

                // Fix button state
                var $_b = $('[data-dimension="'+ t +'"]');
                $_b.find('button').removeClass('active');
                $_b.find('button[data-filter="'+v+'"]').toggleClass('active');

                if(t=='available') {
                    that.dim.allUsed.filter(v);
                }
            }else{
                return false;
            }

            if(v!==null) {
                _f.filter(v);
            }else{
                _f.filterAll();
            }
        };

    if(arguments.length==1 && typeof arg1=='object' && arg2===undefined) {
        for(var key in arg1) {
            var filters = (arg1[key] instanceof Array)? arg1[key] : [arg1[key]];
            for(var filter in filters) {
                _applyFilter(key, filters[filter]);
            }
        }
    }else if(typeof arg1=='string') {
        var filters = (arg2 instanceof Array)? arg2 : [arg2];
        for(var filter in filters) {
            _applyFilter(arg1, filters[filter]);
        }
    }else{
        return false;
    }

    dc.redrawAll();
};



// --- Router --- //
jn.deathrow.DeathRowRouter = function(app) {
    this.app = app;
    var that = this;
    
    var _hashHandler = function(scene, frame, filters) {
        that._internal = true;

        if(filters) {
            filters = JSON.parse(Base64.decode(decodeURIComponent(filters)));

            // Sync with app state
            that.state.filters = filters;
        }

        var _filterCallback = function() {
            if(filters) {
                that.state.filters = filters;
            }
            that.app.applyFilters(that.state.filters);

            // Unlock router
            that._internal = false;
        };

        that._internal = true;

        that.app.scrollToScene(
            scene||'title',
            that.state.scene,
            function() {

                if(frame) {
                    that.app.scrollToFrame(scene, frame, _filterCallback);
                }else{
                    _filterCallback();
                }
            }
        );
    };
    
    this.router = Davis(function() {
        // Disable info logging
        this.logger.info = function() {};

        this.configure(function(){
            this.generateRequestOnPageLoad = true;
        });

        this.get('/*smang', function(req) {
            if(that._internal) {
                return false;
            }

            var path = req.params['smang'].split('/');
            if(path.length>3) {
                return false;
            }

            if(!path.length) {
                return false;
            }

            _hashHandler.apply(null, path);
        });
    });

    this.listen();
};

jn.deathrow.DeathRowRouter.prototype = {
    state : {
        scene : '',
        frame : '',
        filters : {
            available : true
        }
    },
    _internal : false,
    //
    buildPath : function(){
        var p = "/"+ this.state.scene +"/"+ this.state.frame + "/",
            f = JSON.stringify(this.state.filters);

        p += encodeURIComponent(Base64.encode(f));

        return p;
    },
    //
    navigate : function(internal) {
        if(internal) {
            this._internal = true;
        }

        Davis.location.replace(new Davis.Request(this.buildPath()));
    },
    //
    listen : function() {
        var that = this;

        function _handleEvent(eventName, stateVar, eventVar) {
            $(document).on(eventName, function(e) {
                if(typeof stateVar=='function') {
                    stateVar(e);
                }else{
                    that.state[stateVar] = e[eventVar];
                }
                that.navigate(true);
            });
        }

        _handleEvent('frameChange', 'frame', 'newFrame');

        _handleEvent('sceneEnter', 'scene', 'id');

        _handleEvent('sceneEnter', function(e){
            if(jn.deathrow.live._suspended) {
                if(e.id=='main') {
                    $('#controls').show();
                }else{
                    $('#controls').hide();
                }
            }
        });

        _handleEvent('chartFiltered', function(e) {
            that.state.filters[e.chart] = $.extend([],
                that.app.charts[e.chart].filters());
        });

        _handleEvent('buttonClicked', function(e) {
            that.app.applyFilters(e.target, e.filter);
            if(that.app.charts[e.target]) {
                that.state.filters[e.target] = $.extend([],
                that.app.charts[e.target].filters());
            }
        });

        $('a[href^="#!"]').click(function(e){
            dc.filterAll();
            that._internal = false;
            var href = $(this).attr('href').split('#!')[1]
            Davis.location.assign(new Davis.Request(href));
            e.preventDefault();
            return false;
        });
    }
}






// --- Helper functions --- //


jn.deathrow.histogramFilterLabel = function(filter, chartName, bins) {
    if(filter instanceof Array) {
        var b0 = bins[Math.ceil(filter[0])],
            b1 = bins[Math.ceil(filter[1])];

        filter = "";

        if(b0 && b1) {
            filter += b0 + " - " + b1;
        }else if(b0) {
            // There is a minimum, no max
            filter += "> "+ b0;
        }else if(b1) {
            // There is a maximum, no min
            filter += "< "+ b1;
        }else{
            // No min, no max
            filter = null;
        }

        if(filter) {
            filter = chartName+": "+filter;
        }
        
    }
    return filter;
}



jn.deathrow.bin = function(value, bins) {
    // Put given value into given bins.
    // Return bin, or if parseInt(value) is NaN, return value itself.
    // Could be optimized with binary search, but not worth rewriting ATM.
    var n = parseInt(value),
        i = bins.length - 1;

    if(isNaN(n)) {
        i = -2;
    }else{
        for(; i>=0; i--) {
            if(n>=bins[i]) {
                break;
            }
        }
    }

    return i;
};







jn.deathrow.setupWindowEvents = function() {
    var that = this;

    var _respond = function() {
        // Suspend scroll-o-rama tweening engine when window is smaller
        if($(window).width()<1112) {
            TweenLite.ticker.sleep();
            $('.page').css('position', 'relative');
            $('.page').css('height', '');
            $('.subpage').css('height', '');
            $('.slide').css('margin-left', '');
            $('#controls').show();

            // Set scroll targets
            if(jn.deathrow.live.dash && jn.deathrow.live.dash.cache) {
                var cache = jn.deathrow.live.dash.cache;
                cache.staticPageTops = [];
                cache.pageSlides = [];
                cache.staticSlideTops = [];
                cache.staticIds = [];
                cache.staticScrollTargets = {
                    '__page__' : {
                        top: 0,
                        bottom: (document.height!==undefined)
                            ? document.height : document.body.offsetHeight
                    }
                };

                $('.page').each(function() {
                    var _top = $(this).offset().top,
                        _bottom = _top + $(this).height(),
                        _slides = $(this).hasClass('slide'),
                        _id = $(this).attr('id'),
                        _target = {top: _top, bottom: _bottom};

                    cache.staticScrollTargets[_id] = _target;

                    cache.staticPageTops.push(_top);
                    cache.staticIds.push(_id);
                    cache.pageSlides.push(_slides);

                    if(_slides) {
                        $(this).find('.subpage').each(function() {
                            cache.staticSlideTops.push($(this).offset().top);
                        });
                    }
                });

            }

            jn.deathrow.live._suspended = true;
        }else{
            TweenLite.ticker.wake();
            jn.deathrow.live._suspended = false;

            $('.page').width($(window).width());
            $('.page').height($(window).height());
            $('.subpage').width($(window).width());
            $('.subpage').height($(window).height());

            if(jn.deathrow.live.scroller) {
                jn.deathrow.live.scroller.triggerCheckAnim();
            }

        }
    }
    _respond();
    $(window).resize(_respond);

    // Add a scroll handler that will fire events when scroll-o-rama is
    // suspended
    $(window).scroll(function() {
        if(!jn.deathrow.live._suspended || !jn.deathrow.live.dash.cache) {
            return false;
        }

        var cache = jn.deathrow.live.dash.cache,
            curPage = /\d/.test(cache.currentPage)? cache.currentPage : '',
            curFrame = /\d/.test(cache.currentFrame)? cache.currentFrame : '',
            _pos = $(window).scrollTop(),
            pageNumber = jn.deathrow.bin(_pos, cache.staticPageTops);

        if(pageNumber<0) {
            pageNumber = 0;
        }else if(pageNumber>=cache.staticPageTops.length) {
            pageNumber = cache.staticPageTops.length-1;
        }

        if(pageNumber!=curPage) {
            var _pid = cache.staticIds[pageNumber];

            $.event.trigger({
                type: "sceneEnter",
                id: _pid
            });

            cache.currentPage = pageNumber;
        }

        if(cache.pageSlides[pageNumber]) {
            var frameNumber = jn.deathrow.bin(_pos, cache.staticSlideTops);
            if(frameNumber<0) {
                frameNumber = 0;
            }else if (frameNumber>=cache.staticSlideTops.length) {
                frameNumber = cache.staticSlideTops.length-1;
            }

            if(frameNumber!=curFrame) {
                $.event.trigger({
                    type: 'frameChange',
                    newFrame: frameNumber
                });

                cache.currentFrame = frameNumber
            }
        }else{
            // page doesn't slide
            if(curFrame!='') {
                $.event.trigger({
                    type: 'frameChange',
                    newFrame: ''
                });
                cache.currentFrame = '';
            }
        }

    })

    // Hide controls
    $('#controls').hide();

    // Set up titles
    $('.chart').each(function() {
        var $this = $(this);
        if($this.attr('data-title')) {
            $this.append('<strong>'+ $this.attr('data-title') +'</strong');
        }

        if($this.attr('data-show-filter')) {
            $this.append('<span class="reset" style="display:none;">Current Filter: <span class="filter"></span></span>');
        }

        $this.append('<a class="reset" href style="display: none;">reset</a>');
        $this.append('<div class="clearfix"></div>');
    });
            

    // Make "data available" filter buttons
    $("#avail>button").click(function() {
        var val = $(this).attr('data-filter').toLowerCase()=='true';

        $.event.trigger({
            type: 'buttonClicked',
            target: 'available',
            filter : val || null
        });

        dc.redrawAll();
    });

    // Permalink events
    $('a.permalink').click(function(e) {
        // Don't follow clicks. These just provide links.
        e.preventDefault();
        return false;
    }).mouseover(function() {
        $(this).find('i').css('visibility', 'visible');
        // Update permalink
        $(this).attr('href', window.location.hash);
    }).mouseout(function() {
        $(this).find('i').css('visibility', 'hidden');
    });
};






jn.deathrow.startScrollORama = function() {
    // Start scrollorama
    jn.deathrow.live.scroller = $.superscrollorama();
    var scroller = jn.deathrow.live.scroller;


    $('.page').each(function() {
        // Set up scrolling for each page in document
        var $this = $(this),
            vars = {};

        if($this.hasClass('slide')) {
            var currentFrame = -1;
            
            vars.onPin = function(){
                $this.css('overflow-x', 'visible');
                $('#controls').fadeIn('fast');

                $.event.trigger({
                    type: "sceneEnter",
                    id: $this.attr('id')
                });

                $.event.trigger({
                    type: 'frameChange',
                    newFrame: currentFrame
                });
            };

            vars.onUnpin = function() {
                if(parseInt($this.css('margin-left'))>=0){
                    $this.css({
                        'overflow-x': 'hidden',
                        'left': 0,
                        'margin-left': 0
                    });
                }
                $('#controls').fadeOut('fast');

                $.event.trigger({
                    type: 'sceneExit',
                    id: $this.attr('id')
                });

                $.event.trigger({
                    type: 'frameChange',
                    newFrame: ''
                });
            };

            vars.anim = new TimelineLite();

            var subpages = $this.find('.subpage'),
                n = subpages.length,
                tweenTo = TweenMax.to($this, 1, {
                    css: {marginLeft: "-200%"},
                    ease: jn.deathrow.makeTieredEasingFunction(n),
                    onUpdate: function(tween) {
                        var t = tween._time,
                            f = ~~(t*n);

                        if(currentFrame!=f) {
                            var oldFrame = currentFrame;
                            currentFrame = f;

                            // Emit event
                            $.event.trigger({
                                type: 'frameChange',
                                newFrame: currentFrame,
                                oldFrame: oldFrame
                            });
                        }
                    },
                    onUpdateParams: ["{self}"]
                });

            vars.anim.append(tweenTo);

        }else{
            // Non-side-scrolling scenes
            vars.onPin = function() {
                $.event.trigger({
                    type: "sceneEnter",
                    id: $this.attr('id')
                });
            }

            vars.onUnpin = function() {
                $.event.trigger({
                    type: "sceneExit",
                    id: $this.attr('id')
                });
            }
        }

        scroller.pin($this, parseInt($this.attr('data-duration')), vars);
    });
};






jn.deathrow.makeTieredEasingFunction = function(scenes) {
    // Make a tiered easing function for a specified number of scenes.
    var n = scenes;

    if(n<2) {
        return Linear.easeNone;
    }

    var points = [],
        bottom = 0,
        step = 1/(2*(n-1));

    for(var i=0; i<n; i++) {
        var plateau = i/(n-1),
            mid = Math.min(plateau + step, 1);

        // Make three bezier points:
        // 1. {bottom, plateau, plateau}
        points.push({
            s: bottom,
            cp: plateau,
            e: plateau
        });

        // 2. {plateau, plateau, plateau}
        points.push({
            s: plateau,
            cp: plateau,
            e: plateau
        });

        // 3. {plateau, plateau, step}
        points.push({
            s: plateau,
            cp: plateau,
            e: mid
        })

        // Make step new bottom
        bottom = mid;
    }

    var name = "customEase"+Math.round(100000*Math.random());
    return CustomEase.create(name, points);
}




// Start app


$(function init() {
    $('#loadMode').height($(window).height());
    jn.deathrow.setupWindowEvents();
    jn.deathrow.startScrollORama();
    

    // Make the visualizations
    var _d;
    jn.deathrow.live.dash = _d = new jn.deathrow.Dashboard();

    $(document).on('allChartsRendered', function() {
        window.filter = jn.deathrow.live.dash.applyFilters;

        if(jn.deathrow.live._suspended){
            $(window).trigger('resize');
        }

        $('#loadMode').fadeOut(1000, function() {
            jn.deathrow.live.router = new jn.deathrow.DeathRowRouter(_d);
        });
    });
});




