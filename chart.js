async function getData() {
    const s = await fetch('data.json').then(e => e.json());
    console.log(s);
    return s;
}

function cleanData(data) {
    const s = new Set();
    const _data = data.filter(xx => {
        if (!s.has(xx.datetime)) {
            s.add(xx.datetime);
            return true;
        }
        return false;
    });
    return _data;
}

async function createChart() {
    const xxx = await getData();
    const _data = cleanData(xxx);
    const symbol = 'AMZN';

    document.getElementById('container').innerHTML = '';
    const fullWidth = window.outerWidth;
    const fullHeight = 700;
    const margin = {
        top: 20, 
        right: 70, 
        bottom: 30, 
        left: 70
    };
    const width = fullWidth - 160 - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;
    const volumeHeight = fullHeight * .25;

    const parseDate = d3.timeParse('%d-%b-%y');

    const zoom = d3.zoom()
        .on('zoom', zoomed);

    const x = techan.scale.financetime()
        .range([0, width]);

    const y = d3.scaleLinear()
        .range([height, 0]);
    const bisect = d3.bisector(d => d.date).left;
    const yPercent = y.copy();   // Same as y at this stage, will get a different domain later

    const yVolume = d3.scaleLinear()
        .range([height, height - volumeHeight]);

// tslint:disable-next-line:one-variable-per-declaration
    let yInit, yPercentInit, zoomableInit;

    const candlestick = techan.plot.candlestick()
        .xScale(x)
        .yScale(y);

    const accessor = candlestick.accessor();
    const indicatorPreRoll = 33;  // Don't show where indicators don't have data

    const datum = _data.map(d => ({
        date: moment(d.datetime, 'YYYY-MM-DD').toDate(),
        open: +d.open,
        high: +d.high,
        low: +d.low,
        close: +d.close,
        volume: +d.volume
    })).sort((a, b) => d3.ascending(accessor.d(a), accessor.d(b)));

    const sma0 = techan.plot.sma()
        .xScale(x)
        .yScale(y);

    const sma1 = techan.plot.sma()
        .xScale(x)
        .yScale(y);

    const ema2 = techan.plot.ema()
        .xScale(x)
        .yScale(y);

    const xAxis = d3.axisBottom(x)
        .ticks(24);

    const yAxis = d3.axisRight(y)
        .ticks(8);


    const xTopAxis = d3.axisTop(x);
    const yRightAxis = d3.axisRight(y);

    const timeAnnotation = techan.plot.axisannotation()
        .axis(xAxis)
        .orient('bottom')
        .format(d3.timeFormat('%Y-%m-%d'))
        .width(65)
        .translate([0, height]);

    const timeTopAnnotation = techan.plot.axisannotation()
        .axis(xTopAxis)
        .orient('top');

    const ohlcAnnotation = techan.plot.axisannotation()
        .axis(yAxis)
        .orient('left')
        .format(d3.format(',.2f'));

    const ohlcRightAnnotation = techan.plot.axisannotation()
        .axis(yRightAxis)
        .orient('right')
        .format(d3.format(',.2f'))
        .translate([width, 0]);

    const crosshair = techan.plot.crosshair()
        .xScale(x)
        .yScale(y)
        .xAnnotation([timeAnnotation, timeTopAnnotation])
        .yAnnotation([ohlcAnnotation, ohlcRightAnnotation])
        .on('enter', enter)
        .on('out', out)
        .on('move', move);

    const volume = techan.plot.volume()
        .accessor(candlestick.accessor())
        .xScale(x)
        .yScale(yVolume);

    const percentAxis = d3.axisLeft(yPercent)
        .ticks(4)
        .tickFormat(d3.format('+.1%'));

    const volumeAxis = d3.axisRight(yVolume)
        .ticks(4)
        .tickFormat(d3.format(',.3s'));

    const line = techan.plot.trendline()
        .xScale(x)
        .yScale(y);
    const lineInter = techan.plot.trendline()
        .xScale(x)
        .yScale(y);
    const lineMajor = techan.plot.trendline()
        .xScale(x)
        .yScale(y);

    const svg = d3.select('#container').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


    const dataShow = svg.append('rect')
        .attr('class', 'dataShower')
        .attr('x', 30)
        .attr('y', 20)
        .attr('rx', 6)
        .attr('ry', 6)
        .attr('width', 150)
        .attr('height', 130)
        .style('box-shadow', '0 25px 50px -12px rgba(0, 0, 0, 0.25)')
        .attr('fill', '#CFD8E3');

    const [dateText, highText, openText, closeText, lowText, volumeText] = Array.from({length: 6}, (_, i) =>
        svg.append('text')
            .style('text-anchor', 'start')
            .attr('class', 'coords')
            .attr('x', 35)
            .attr('y', 40 + (20 * i))
    );

    [dateText, highText, openText, closeText, lowText, dataShow, volumeText].forEach(d => d.style('display', 'none'));
    svg.append('g').attr('class', 'trendline-minor');
    svg.append('g').attr('class', 'trendline-intermediate');
    svg.append('g').attr('class', 'trendline-major');

    svg.append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('x', 0)
        .attr('y', y(1))
        .attr('width', width)
        .attr('height', y(0) - y(1));

    svg.append('text')
        .attr('class', 'symbol')
        .attr('x', 5)
        .text(symbol);

    svg.append('g')
        .attr('class', 'volume')
        .attr('clip-path', 'url(#clip)');

    svg.append('g')
        .attr('class', 'candlestick')
        .attr('clip-path', 'url(#clip)');

    svg.append('g')
        .attr('class', 'indicator sma ma-0')
        .attr('clip-path', 'url(#clip)');

    svg.append('g')
        .attr('class', 'indicator sma ma-1')
        .attr('clip-path', 'url(#clip)');

    svg.append('g')
        .attr('class', 'indicator ema ma-2')
        .attr('clip-path', 'url(#clip)');

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')');

    svg.append('g')
        .attr('class', 'y axis')
        .attr('transform', 'translate(' + width + ',0)');

    svg.append('g')
        .attr('class', 'percent axis');

    svg.append('g')
        .attr('class', 'volume axis');


    svg.append('g')
        .attr('class', 'y annotation left')
        .datum([{value: 74}, {value: 67.5}, {value: 58}, {value: 40}]) // 74 should not be rendered
        .call(ohlcAnnotation);

    svg.append('g')
        .attr('class', 'x annotation bottom')
        .datum([{value: x.domain()[30]}])
        .call(timeAnnotation);

    svg.append('g')
        .attr('class', 'y annotation right')
        .datum([{value: 61}, {value: 52}])
        .call(ohlcRightAnnotation);

    svg.append('g')
        .attr('class', 'x annotation top')
        .datum([{value: x.domain()[80]}])
        .call(timeTopAnnotation);

    svg.append('g')
        .attr('class', 'crosshair')
        .datum({x: x.domain()[80], y: 67.5})
        // .datum(datum)
        .call(crosshair)
        .each(d => {
            move(d);
        }); // Display the current data

    svg.append('rect')
        .attr('class', 'pane')
        .style('display', 'block')
        .attr('width', width)
        .attr('height', height)
        .call(zoom);

    const lineLegend = svg.append('rect')
        .attr('class', 'line-legend')
        .attr('x', 240)
        .attr('y', 20)
        .attr('rx', 6)
        .attr('ry', 6)
        .attr('width', 340)
        .attr('height', 50)
        .style('box-shadow', '0 25px 50px -12px rgba(0, 0, 0, 0.25)')
        .attr('fill', 'transparent')
    ;

    const lineMinorLegendCircle = svg.append('circle')
        .attr('stroke', 'blue')
        .attr('stroke-width', 1)
        .attr('class', 'minor-circle-legend active')
        .attr('r', 5)
        .attr('cx', 245)
        .attr('cy', 35)
        .on('click', function () {
            this.classList.toggle('active');
            svg.selectAll('g.trendline-minor').style('display', this.classList.contains('active') ? 'block' : 'none');
        });

    svg.append('text')
        .style('text-anchor', 'start')
        .attr('class', 'minor-text-legend')
        .attr('x', 265)
        .attr('y', 40).text('Minor')
        .on('click', () => {
            const el = (document.querySelector('.minor-circle-legend'));
            el?.classList.toggle('active');
            svg.selectAll('g.trendline-minor').style('display', el?.classList.contains('active') ? 'block' : 'none');
        })
    ;

    svg.append('circle')
        .attr('stroke', 'orange')
        .attr('stroke-width', 1)
        .attr('class', 'intermediate-circle-legend active')
        .attr('r', 5)
        .attr('cx', 245)
        .attr('cy', 55)
        .on('click', function () {
            this.classList.toggle('active');
            svg.selectAll('g.trendline-intermediate').style('display', this.classList.contains('active') ? 'block' : 'none');
        });

    svg.append('text')
        .style('text-anchor', 'start')
        .attr('class', 'intermediate-text-legend')
        .attr('x', 265)
        .attr('y', 60).text('Intermediate')
        .on('click', () => {
            const el = (document.querySelector('.intermediate-circle-legend'));
            el?.classList.toggle('active');
            svg.selectAll('g.trendline-intermediate').style('display', el?.classList.contains('active') ? 'block' : 'none');
        });

    svg.append('circle')
        .attr('stroke', 'darkgreen')
        .attr('stroke-width', 1)
        .attr('class', 'major-circle-legend active')
        .attr('r', 5)
        .attr('cx', 245)
        .attr('cy', 75)
        .on('click', function () {
            this.classList.toggle('active');
            svg.selectAll('g.trendline-major').style('display', this.classList.contains('active') ? 'block' : 'none');
        });

    svg.append('text')
        .style('text-anchor', 'start')
        .attr('class', 'intermediate-text-legend')
        .attr('x', 265)
        .attr('y', 80).text('Major')
        .on('click', () => {
            const el = (document.querySelector('.major-circle-legend'));
            el?.classList.toggle('active');
            svg.selectAll('g.trendline-major').style('display', el?.classList.contains('active') ? 'block' : 'none');
        });

    x.domain(techan.scale.plot.time(datum, accessor).domain());
    y.domain(techan.scale.plot.ohlc(datum.slice(indicatorPreRoll), accessor).domain());
    yPercent.domain(techan.scale.plot.percent(y, accessor(datum[indicatorPreRoll])).domain());
    yVolume.domain(techan.scale.plot.volume(datum, accessor.v).domain());

    svg.select('g.candlestick').datum(datum).call(candlestick);
    svg.select('g.volume').datum(datum).call(volume);

    svg.selectAll('g.trendline-minor').datum(createTrendlineData(xxx, 'minor')).call(line);
    svg.selectAll('g.trendline-intermediate').datum(createTrendlineData(xxx, 'intermediate')).call(lineInter);
    svg.selectAll('g.trendline-major').datum(createTrendlineData(xxx, 'major')).call(lineMajor);


    zoomableInit = x.zoomable().domain([indicatorPreRoll, datum.length]).copy(); // Zoom in a little to hide indicator preroll
    yInit = y.copy();
    yPercentInit = yPercent.copy();

    draw();


    function reset() {
        zoom.scale(1);
        zoom.translate([0, 0]);
        draw();
    }

    function zoomed() {
        console.log(x);
        x.zoomable().domain(d3.event.transform.rescaleX(zoomableInit).domain());
        y.domain(d3.event.transform.rescaleY(yInit).domain());
        yPercent.domain(d3.event.transform.rescaleY(yPercentInit).domain());

        draw();
    }

    function draw() {
        svg.select('g.x.axis').call(xAxis);
        svg.select('g.y.axis').call(yAxis);
        svg.select('g.volume.axis').call(volumeAxis);
        svg.select('g.percent.axis').call(percentAxis);

        // We know the data does not change, a simple refresh that does not perform data joins will suffice.
        svg.select('g.candlestick').call(candlestick.refresh);
        svg.select('g.volume').call(volume.refresh);
        svg.select('g.sma.ma-0').call(sma0.refresh);
        svg.select('g.sma.ma-1').call(sma1.refresh);
        svg.select('g.ema.ma-2').call(ema2.refresh);
        svg.selectAll('g.trendline-minor').call(line.refresh);
        svg.selectAll('g.trendline-intermediate').call(lineInter.refresh);
        svg.selectAll('g.trendline-major').call(lineMajor.refresh);
    }

    function enter() {
        [dateText, highText, openText, closeText, lowText, dataShow, volumeText].forEach(d => d.style('display', 'inline'));
    }

    function out() {
        [dateText, highText, openText, closeText, lowText, dataShow, volumeText].forEach(d => d.style('display', 'none'));
    }

    function move(coords) {
        const point = datum.find(xx => xx.date === coords.x);
        dateText.text(timeAnnotation.format()(coords.x));
        openText.html('Open:&nbsp&nbsp&nbsp&nbsp&nbsp$&#8239;' + point?.open);
        closeText.html('Close:&nbsp&nbsp&nbsp&nbsp&#8239;$&#8239;' + point?.close);
        lowText.html('Low:&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp$&#8239;' + point?.low);
        highText.html('High:&nbsp&nbsp&nbsp&nbsp&nbsp&#8239;&#8239;$&#8239;' + point?.high);
        volumeText.html('Volume:&nbsp$&#8239;' + point?.volume);
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
}

createChart();


document.addEventListener('keydown', ($event) => {
    if ($event.key?.toLowerCase() === 'shift') {
        (document.querySelector('.pane')).style.display = 'block';
        (document.querySelector('.dataShower')).style.display = 'none';
    }
});


document.addEventListener('keyup', ($event) => {
    if ($event.key?.toLowerCase() === 'shift') {
        (document.querySelector('.pane')).style.display = 'none';
        (document.querySelector('.dataShower')).style.display = 'block';
    }
});

