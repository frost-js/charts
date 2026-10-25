const data = {
    datasets: [
        {
            label: 'Group A',
            data: [{ x: 1, y: 3 }, { x: 2, y: 7 }, { x: 5, y: 6 }, { x: 9, y: 12 }, { x: 10, y: 9 }],
            pointRadius: 5,
        },
        {
            label: 'Group B',
            data: [{ x: 2, y: 2 }, { x: 4, y: 4 }, { x: 8, y: 7 }],
            pointRadius: 5,
        },
    ],
};
const chart = new Chart(document.getElementById('chart'), {
    type: 'scatter',
    data,
    title: { display: false },
    legend: { position: 'bottom' },
});

document.getElementById('update-data').addEventListener('click', () => {
    const datasets = chart.getData();

    for (const dataset of datasets) {
        dataset.data = dataset.data.map((point, index) => ({
            x: point.x,
            y: point.y + (index % 2 ? 2 : -2),
        }));
    }

    chart.setData({ labels: data.labels, datasets });
    document.getElementById('chart-status').textContent = 'Sample values updated.';
});

document.getElementById('reset-data').addEventListener('click', () => {
    chart.setData(data);
    document.getElementById('chart-status').textContent = 'Showing the original data.';
});
