const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [
        {
            label: 'North',
            data: [20, 25, 250, 90, 33],
            borderWidth: 0,
        },
        {
            label: 'South',
            data: [24, -80, 33, 67, 23],
            borderWidth: 0,
        },
        {
            label: 'East',
            data: [91, 15, -8, 32, 151],
            borderWidth: 0,
        },
        {
            label: 'West',
            data: [44, 3, 12, 125, 16],
            borderWidth: 0,
        },
    ],
};
const chart = new Chart(document.getElementById('chart'), {
    type: 'bar',
    orientation: 'horizontal',
    data,
    title: { display: false },
    legend: { position: 'bottom' },
});

document.getElementById('update-data').addEventListener('click', () => {
    const datasets = chart.getData();

    for (const dataset of datasets) {
        dataset.data.push(dataset.data.shift());
    }

    chart.setData({ labels: data.labels, datasets });
    document.getElementById('chart-status').textContent = 'Values shifted to the next category.';
});

document.getElementById('reset-data').addEventListener('click', () => {
    chart.setData(data);
    document.getElementById('chart-status').textContent = 'Showing the original data.';
});
