buildFinanceChart();

async function buildFinanceChart() {
    const dim = initializeDim();
    const tooltip = buildTooltip();

    const indicatorTop = d3.scaleLinear()
        .range([dim.indicator.top, dim.indicator.bottom]);

    const parseDate = d3.timeParse('%d-%b-%y');

    const zoom = d3.zoom()
        .on('zoom', zoomed);

    const x = techan.scale.financetime()
        .range([0, dim.plot.width]);;
    const y = d3.scaleLinear()
        .range([dim.ohlc.height, 0]);

    const yPercent = y.copy();

    let yInit, yPercentInit, zoomableInit;

    const yVolume = d3.scaleLinear()
        .range([y(0), y(0.2)]);

    const candlestick = techan.plot.candlestick()
        .xScale(x)
        .yScale(y);

    const volume = techan.plot.volume()
        .accessor(candlestick.accessor())
        .xScale(x)
        .yScale(yVolume);

    const line = techan.plot.trendline()
        .xScale(x)
        .yScale(y);
    const lineInter = techan.plot.trendline()
        .xScale(x)
        .yScale(y);
    const lineMajor = techan.plot.trendline()
        .xScale(x)
        .yScale(y);

    const xAxis = d3.axisBottom(x);

    const timeAnnotation = techan.plot.axisannotation()
        .axis(xAxis)
        .orient('bottom')
        .format(d3.timeFormat('%Y-%m-%d'))
        .width(65)
        .translate([0, dim.plot.height]);
    
    const yAxis = d3.axisRight(y);
    const ohlcAnnotation = techan.plot.axisannotation()
        .axis(yAxis)
        .orient('right')
        .format(d3.format(',.2f'))
        .translate([x(1), 0]);

    const closeAnnotation = techan.plot.axisannotation()
        .axis(yAxis)
        .orient('right')
        .accessor(candlestick.accessor())
        .format(d3.format(',.2f'))
        .translate([x(1), 0]);

    const percentAxis = d3.axisLeft(yPercent)
        .tickFormat(d3.format('+.1%'));

    const percentAnnotation = techan.plot.axisannotation()
        .axis(percentAxis)
        .orient('left');

    const volumeAxis = d3.axisRight(yVolume)
        .ticks(3)
        .tickFormat(d3.format(',.3s'));

    const volumeAnnotation = techan.plot.axisannotation()
        .axis(volumeAxis)
        .orient('right')
        .width(35);

    const ohlcCrosshair = techan.plot.crosshair()
        .xScale(timeAnnotation.axis().scale())
        .yScale(ohlcAnnotation.axis().scale())
        .xAnnotation(timeAnnotation)
        .yAnnotation([ohlcAnnotation, percentAnnotation, volumeAnnotation])
        .verticalWireRange([0, dim.plot.height]);

    let svg = d3.select('#container').append('svg')
        .attr('width', dim.width)
        .attr('height', dim.height);

    let defs = svg.append('defs');

    defs.append('clipPath')
            .attr('id', 'ohlcClip')
        .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', dim.plot.width)
            .attr('height', dim.ohlc.height);

    defs.selectAll('indicatorClip').data([0, 1])
        .enter()
            .append('clipPath')
            .attr('id', (d, i) => 'indicatorClip-' + i)
        .append('rect')
            .attr('x', 0)
            .attr('y', (d, i) => indicatorTop(i))
            .attr('width', dim.plot.width)
            .attr('height', dim.indicator.height);

    svg = svg.append('g')
            .attr('transform', `translate(${dim.margin.left}, ${dim.margin.top})`);

    svg.append('text')
            .attr('class', 'symbol')
            .attr('x', 20)
            .text('AMZN');

    svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', `translate(0, ${dim.plot.height})`);


    const ohlcSelection = svg.append('g')
            .attr('class', 'ohlc')
            .attr('transform', 'translate(0,0)');

    ohlcSelection.append('g')
            .attr('class', 'axis')
            .attr('transform', 'translate(' + x(1) + ',0)')
        .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -12)
            .attr('dy', '.71em')
            .style('text-anchor', 'end')
            .text('Price ($)');

    ohlcSelection.append('g')
            .attr('class', 'close annotation up');

    ohlcSelection.append('g')
            .attr('class', 'volume')
            .attr('clip-path', 'url(#ohlcClip)');

    ohlcSelection.append('g')
            .attr('class', 'candlestick')
            .attr('clip-path', 'url(#ohlcClip)');

    ohlcSelection.append('g')
            .attr('class', 'indicator sma ma-0')
            .attr('clip-path', 'url(#ohlcClip)');

    ohlcSelection.append('g')
            .attr('class', 'indicator sma ma-1')
            .attr('clip-path', 'url(#ohlcClip)');

    ohlcSelection.append('g')
            .attr('class', 'indicator ema ma-2')
            .attr('clip-path', 'url(#ohlcClip)');

    ohlcSelection.append('g')
            .attr('class', 'percent axis');

    ohlcSelection.append('g')
            .attr('class', 'volume axis');


    // Add trendlines and other interactions last to be above zoom pane
    svg.append('g')
        .attr('class', 'crosshair ohlc');

    svg.append('g')
        .attr('class', 'trendline-minor')
        .attr('clip-path', 'url(#ohlcClip)');

    svg.append('g')
        .attr('class', 'trendline-intermediate')
        .attr('clip-path', 'url(#ohlcClip)');
    svg.append('g')
        .attr('class', 'trendline-major')
        .attr('clip-path', 'url(#ohlcClip)');

    const accessor = candlestick.accessor();
    const indicatorPreRoll = 33;
    
    const financeData = await fetchData();
    const cleanedData = cleanData(financeData);

    const data = cleanedData.map(d => ({
        date: moment(d.datetime, 'YYYY-MM-DD').toDate(),
        open: +d.open,
        high: +d.high,
        low: +d.low,
        close: +d.close,
        volume: +d.volume
    })).sort((a, b) => d3.ascending(accessor.d(a), accessor.d(b)));

    x.domain(techan.scale.plot.time(data).domain());
    y.domain(techan.scale.plot.ohlc(data.slice(indicatorPreRoll)).domain());
    yPercent.domain(techan.scale.plot.percent(y, accessor(data[indicatorPreRoll])).domain());
    yVolume.domain(techan.scale.plot.volume(data).domain());

    svg.select('g.candlestick').datum(data).call(candlestick);
    svg.select('g.close.annotation').datum([data[data.length-1]]).call(closeAnnotation);
    svg.select('g.volume').datum(data).call(volume);

    svg.select('g.crosshair.ohlc').call(ohlcCrosshair).call(zoom);
    svg.selectAll('g.trendline-minor')
        .datum(createTrendlineData(financeData, 'minor'))
        .call(line);
    svg.selectAll('g.trendline-intermediate')
        .datum(createTrendlineData(financeData, 'intermediate'))
        .call(lineInter);
    svg.selectAll('g.trendline-major')
        .datum(createTrendlineData(financeData, 'major'))
        .call(lineMajor);



    /**
     * Build line legeds
     */
    buildLineLegends(svg, dim);


    // Stash for zooming
    zoomableInit = x.zoomable().domain([indicatorPreRoll, data.length]).copy();
    yInit = y.copy();
    yPercentInit = yPercent.copy();

    draw();

    function reset() {
        zoom.scale(1);
        zoom.translate([0,0]);
        draw();
    }

    function zoomed() {
        x.zoomable().domain(d3.event.transform.rescaleX(zoomableInit).domain());
        y.domain(d3.event.transform.rescaleY(yInit).domain());
        yPercent.domain(d3.event.transform.rescaleY(yPercentInit).domain());

        draw();
    }

    function draw() {
        svg.select('g.x.axis').call(xAxis);
        svg.select('g.ohlc .axis').call(yAxis);
        svg.select('g.volume.axis').call(volumeAxis);
        svg.select('g.percent.axis').call(percentAxis);

        svg.select('g.candlestick').call(candlestick.refresh);
        svg.select('g.close.annotation').call(closeAnnotation.refresh);
        svg.select('g.volume').call(volume.refresh);
        svg.select('g.crosshair.ohlc').call(ohlcCrosshair.refresh);
        svg.selectAll('g.trendline-minor').call(line.refresh);
        svg.selectAll('g.trendline-intermediate').call(lineInter.refresh);
        svg.selectAll('g.trendline-major').call(lineMajor.refresh);
    }
}

function initializeDim() {
    const container = document.getElementById('container');
    const clientRect = container.getBoundingClientRect();

    const dim = {
        width: clientRect.width,
        height: 500,
        margin: {
            top: 70,
            right: 120,
            bottom: 70,
            left: 88
        },
        ohlc: {
            height: 350
        },
        indicator: {
            height: 65,
            padding: 6
        }
    };

    dim.plot = {
        width: dim.width -  dim.margin.left - dim.margin.right,
        height: dim.height - dim.margin.top - dim.margin.bottom
    };

    dim.indicator.top = dim.ohlc.height + dim.indicator.padding;
    dim.indicator.bottom = dim.indicator.top + dim.indicator.height + dim.indicator.padding;

    return dim;
}

async function fetchData() {
    const response = await fetch('data.json');
    const data = await response.json();
    
    return data;
}

function cleanData(data) {
    const dataSet = new Set();

    const cleanedData = data.filter(d => {
        if (!dataSet.has(d.datetime)) {
            dataSet.add(d.datetime);
            return true;
        }
        return false;
    });

    return cleanedData;
}

function createTrendlineData(data, peakType) {
    const trans = {
        'valley': 'low',
        'peak': 'high',
        'peak_ph': 'high',
        'valley_ph': 'low',
    };
    const d = [];
    let cur = {
        start: {date: moment(data[0].datetime, 'YYYY-MM-DD').toDate(), value: data[0]['low']},
        end: {}
    };
    data.forEach(e => {
        if (e[peakType + ' peak-valley']) {
            cur.end = {
                date: moment(e.datetime, 'YYYY-MM-DD').toDate(),
                value: e[trans[e[peakType + ' peak-valley']]]
            };
            d.push(cur);
            cur = {
                start: {
                    date: moment(e.datetime, 'YYYY-MM-DD').toDate(),
                    value: e[trans[e[peakType + ' peak-valley']]]
                },
                end: {}
            };
        }
    });
    return d;
}

function buildLineLegends(svg, dim) {
    const group = svg.append('g')
        .attr('class', 'line-legends-group')
        .attr('transform', `translate(4, ${dim.plot.height + 49})`);

    const minorLegendGroup = group.append('g')
        .attr('class', 'line-legend-group line-legend-group--active')
        .on('click', function () {
            this.classList.toggle('line-legend-group--active');
            svg.selectAll('g.trendline-minor')
                .style('display', this.classList.contains('line-legend-group--active') ? 'block' : 'none');
        });

    minorLegendGroup.append('circle')
        .attr('fill', 'blue')
        .attr('r', 5)
        .attr('cx', 0)
        .attr('cy', 0);

    minorLegendGroup.append('text')
        .style('text-anchor', 'start')
        .attr('x', 10)
        .attr('y', 4)
        .text('Minor');
    

    const intermediateLegendGroup = group.append('g')
        .attr('class', 'line-legend-group line-legend-group--active')
        .attr('transform', 'translate(56, 0)')
        .on('click', function () {
            this.classList.toggle('line-legend-group--active');
            svg.selectAll('g.trendline-intermediate')
                .style('display', this.classList.contains('line-legend-group--active') ? 'block' : 'none');
        });

    intermediateLegendGroup.append('circle')
        .attr('fill', 'orange')
        .attr('r', 5)
        .attr('cx', 0)
        .attr('cy', 0);

    intermediateLegendGroup.append('text')
        .style('text-anchor', 'start')
        .attr('x', 10)
        .attr('y', 4)
        .text('Intermediate');

    const majorLegendGroup = group.append('g')
        .attr('class', 'line-legend-group line-legend-group--active')
        .attr('transform', 'translate(144, 0)')
        .on('click', function () {
            this.classList.toggle('line-legend-group--active');
            svg.selectAll('g.trendline-major')
                .style('display', this.classList.contains('line-legend-group--active') ? 'block' : 'none');
        });

    majorLegendGroup.append('circle')
        .attr('fill', 'darkgreen')
        .attr('r', 5)
        .attr('cx', 0)
        .attr('cy', 0);

    majorLegendGroup.append('text')
        .style('text-anchor', 'start')
        .attr('x', 10)
        .attr('y', 4)
        .text('Major');
}

function buildTooltip() {
    let tooltip = document.querySelector('.tooltip');
    
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'tooltip';

        document.body.append(tooltip);
    }

    tooltip = d3.select(tooltip);

    const renderContent = (data) => {
        const htmlContent = `
            <div>
                <h4>2020</h4>
                <div class="tooltip-item">
                    <span>Open: </span>
                    <span>${data.open}</span>
                </div>
                <div class="tooltip-item">
                    <span>Close: </span>
                    <span>${data.close}</span>
                </div>
                <div class="tooltip-item">
                    <span>Low: </span>
                    <span>${data.low}</span>
                </div>
                <div class="tooltip-item">
                    <span>High: </span>
                    <span>${data.high}</span>
                </div>
                <div class="tooltip-item">
                    <span>Volume: </span>
                    <span>${data.volume}</span>
                </div>
            </div>
        `;

        tooltip.html(htmlContent);
    };

    const show = ({ position, data }) => {
        tooltip
            .attr('class', 'tooltip tooltip')
            .style('left', position.left + 'px')
            .style('top', position.top + 'px');

        renderContent(data);
    };

    const hide = () => {
        tooltip
            .attr('class', 'tooltip tooltip--hidden');
    };

    const destroy = () => {
        tooltip.destroy();
    };

    hide();

    return {
        show,
        hide,
        destroy
    };
}