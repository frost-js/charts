const data = {
    labels: ['Direct', 'Search', 'Social', 'Email', 'Referral', 'Partners', 'Events', 'Video', 'Podcast', 'Community', 'Ads', 'Other'],
    datasets: [
        { label: 'Visits', data: [24, 18, 14, 10, 8, 7, 5, 4, 3, 3, 2, 2], borderWidth: 0 },
    ],
};
const chart = new Chart(document.getElementById('chart'), {
    type: 'donut',
    data,
    title: { display: false },
    legend: { position: 'right' },
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
