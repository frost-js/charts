const data = {
    labels: ['Direct', 'Search', 'Social', 'Referral', 'Email'],
    datasets: [
        {
            label: 'Visits',
            data: [20, 5, 50, 90, 13],
            borderWidth: 0,
        },
    ],
};
const chart = new Chart(document.getElementById('chart'), {
    type: 'pie',
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
