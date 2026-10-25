const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [
        { label: 'Subscriptions', data: [30, 45, 38, 60, 70], borderWidth: 2 },
        { label: 'One-off sales', data: [20, -10, 30, -5, 25], borderWidth: 2 },
    ],
};
const chart = new Chart(document.getElementById('chart'), {
    type: 'area',
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
