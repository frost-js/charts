Chart.defaults = {
    type: 'bar',
    // width: 800,
    // height: 500,
    font: {
        family: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        size: 12,
        weight: 'normal',
        lineHeight: 1.2
    },
    title: {
        display: true,
        text: 'Title',
        padding: 10,
        font: {
            size: 18,
            weight: 'bold'
        },
        color: '#000',
        position: 'top',
        align: 'center'
    },
    legend: {
        display: true,
        // padding: 10,
        position: 'top',
        align: 'center',
        maxHeight: null,
        maxWidth: null,
        labels: {
            boxWidth: 20,
            boxHeight: 12,
            font: {},
            padding: 10,
            color: '#000',
            textAlign: 'center'
        }
    },
    scales: {
        x: {
            display: true,
            grid: {
                display: true,
                drawBorder: true,
                borderColor: '#000',
                borderWidth: 1,
                lineColor: '#aaa',
                lineWidth: 1,
                tickLength: 8
            },
            ticks: {
                display: true,
                font: {},
                padding: 5,
                color: '#000',
                drawTicks: true
            }
        },
        y: {
            display: true,
            grid: {
                display: true,
                drawBorder: true,
                borderColor: '#000',
                borderWidth: 1,
                lineColor: '#aaa',
                lineWidth: 1,
                tickLength: 8
            },
            ticks: {
                display: true,
                font: {},
                padding: 5,
                color: '#000',
                drawTicks: true,
                tickColor: '#aaa'
            }
        }
    },
    layout: {
        padding: 20
    }
};

UI.initComponent('chart', Chart);

UI.Chart = Chart;
