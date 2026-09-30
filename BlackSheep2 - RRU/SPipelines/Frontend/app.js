document.addEventListener('DOMContentLoaded', () => {
  // Global Application State
  const state = {
    weather: 'Clear',
    congestion: 'Low',
    tsr: 'Minor',
    selectedTrain: '12001'
  };

  // DOM Elements
  const btnCompoundEtaTop = document.getElementById('btnCompoundEtaTop');
  const compoundEtaModal = document.getElementById('compoundEtaModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalGotItBtn = document.getElementById('modalGotItBtn');
  const compoundEtaSection = document.getElementById('compoundEtaSection');

  const weatherBtns = document.querySelectorAll('#weatherGroup .pill-btn');
  const congestionBtns = document.querySelectorAll('#congestionGroup .pill-btn');
  const tsrBtns = document.querySelectorAll('#tsrGroup .pill-btn');
  const presetChips = document.querySelectorAll('.preset-chips .chip');

  const trainSearchInput = document.getElementById('trainSearchInput');
  const searchDropdown = document.getElementById('searchDropdown');
  const tableSearchFilter = document.getElementById('tableSearchFilter');

  // "Compound ETA" Top Button Behavior
  btnCompoundEtaTop.addEventListener('click', () => {
    compoundEtaModal.classList.remove('hidden');
  });

  closeModalBtn.addEventListener('click', () => {
    compoundEtaModal.classList.add('hidden');
    compoundEtaSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  modalGotItBtn.addEventListener('click', () => {
    compoundEtaModal.classList.add('hidden');
    compoundEtaSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  compoundEtaModal.addEventListener('click', (e) => {
    if (e.target === compoundEtaModal) {
      compoundEtaModal.classList.add('hidden');
    }
  });

  // Toggle Clusters
  function setupPills(pills, stateProp) {
    pills.forEach(btn => {
      btn.addEventListener('click', () => {
        pills.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state[stateProp] = btn.getAttribute('data-val');
        refreshDashboard();
      });
    });
  }

  setupPills(weatherBtns, 'weather');
  setupPills(congestionBtns, 'congestion');
  setupPills(tsrBtns, 'tsr');

  // Popular Train Presets
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      presetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.selectedTrain = chip.getAttribute('data-train');
      trainSearchInput.value = '';
      refreshTrainJourney();
    });
  });

  // Train Search Typeahead
  let searchTimer = null;
  trainSearchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    if (q.length < 2) {
      searchDropdown.classList.add('hidden');
      return;
    }

    searchTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const results = await res.json();
        renderSearchDropdown(results);
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 200);
  });

  function renderSearchDropdown(items) {
    searchDropdown.innerHTML = '';
    if (!items || items.length === 0) {
      searchDropdown.innerHTML = '<div class="dropdown-item">No matching trains found</div>';
      searchDropdown.classList.remove('hidden');
      return;
    }

    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'dropdown-item';
      row.innerHTML = `
        <span><strong>${it.train_no}</strong> &bull; ${it.train_name}</span>
        <span style="color:#64748b; font-size:11px;">${it.source} &rarr; ${it.destination}</span>
      `;
      row.addEventListener('click', () => {
        state.selectedTrain = it.train_no;
        trainSearchInput.value = `${it.train_no} - ${it.train_name}`;
        searchDropdown.classList.add('hidden');
        presetChips.forEach(c => c.classList.remove('active'));
        refreshTrainJourney();
      });
      searchDropdown.appendChild(row);
    });
    searchDropdown.classList.remove('hidden');
  }

  document.addEventListener('click', (e) => {
    if (!trainSearchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
      searchDropdown.classList.add('hidden');
    }
  });

  // Refresh Selected Train Compound Journey
  async function refreshTrainJourney() {
    try {
      const url = `/api/predict?train_no=${state.selectedTrain}&weather=${state.weather}&congestion=${state.congestion}&tsr=${state.tsr}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch train prediction');
      const data = await res.json();

      // Title & Route
      document.getElementById('trainTierBadge').textContent = data.train_tier;
      document.getElementById('trainFullName').textContent = `${data.train_no} / ${data.train_name}`;
      document.getElementById('trainRoute').textContent = `${data.source_station} \u2192 ${data.destination_station}`;

      // Quick Facts
      document.getElementById('specDistance').textContent = `${data.total_distance_km} km`;
      document.getElementById('specDuration').textContent = `${(data.duration_mins/60).toFixed(1)} hrs (${data.duration_mins} mins)`;
      document.getElementById('specEA').textContent = `${data.EA_allotted_mins.toFixed(1)} mins`;
      document.getElementById('specHalts').textContent = `${data.total_halts} stations`;

      // Mathematical Values
      const p = data.primary_breakdown;
      const c = data.cascade_breakdown;
      const m = data.math_resolution;
      const isLate = m.Arrival_Status === 'LATE';

      // Status Pill
      const statusBox = document.getElementById('arrivalStatusBox');
      const statusTitle = document.getElementById('statusTitle');
      const statusSub = document.getElementById('statusSub');

      if (isLate) {
        statusBox.className = 'arrival-status-box late';
        statusTitle.textContent = `DELAYED (+${m.NetDelay}m)`;
        statusSub.textContent = 'Buffer deficit: delay exceeds timetable slack';
      } else {
        statusBox.className = 'arrival-status-box on-time';
        statusTitle.textContent = 'ON TIME (0m Delay)';
        statusSub.textContent = 'Entire delay absorbed by timetable buffer (EA)';
      }

      // Format Times
      const schedH = Math.floor(m.ScheduledArrival_mins / 60) % 24;
      const schedM = m.ScheduledArrival_mins % 60;
      const schedStr = `${String(schedH).padStart(2, '0')}:${String(schedM).padStart(2, '0')} IST`;

      const etaH = Math.floor(m.Final_ETA_mins / 60) % 24;
      const etaM = m.Final_ETA_mins % 60;
      const etaStr = `${String(etaH).padStart(2, '0')}:${String(etaM).padStart(2, '0')} IST`;

      // Timeline Stepper Values
      document.getElementById('stepSchedTime').textContent = schedStr;
      document.getElementById('stepPrimaryVal').textContent = `+${p.PrimaryDelay.toFixed(1)} mins`;
      document.getElementById('stepCascadeVal').textContent = `+${c.CascadeDelay.toFixed(1)} mins`;
      document.getElementById('stepGrossVal').textContent = `${m.grossDelay.toFixed(1)} mins`;
      document.getElementById('stepBufferVal').textContent = `\u2212${m.Absorbed_by_EA.toFixed(1)} mins`;
      document.getElementById('stepFinalEtaVal').textContent = etaStr;
      document.getElementById('stepFinalStatusVal').textContent = isLate ? `DELAYED (+${m.NetDelay}m)` : `ON TIME (0m Delay)`;

      // Final ETA Card styling
      const finalCard = document.getElementById('finalEtaCard');
      if (isLate) {
        finalCard.style.background = '#991b1b'; // dark red
        finalCard.style.borderColor = '#b91c1c';
      } else {
        finalCard.style.background = '#0f172a'; // slate
        finalCard.style.borderColor = '#0f172a';
      }

      // Friendly Explanation Text
      const explBox = document.getElementById('explanationBox');
      const explText = document.getElementById('explanationText');
      if (isLate) {
        explBox.className = 'explanation-box deficit';
        explText.innerHTML = `
          <strong>Schedule Deficit:</strong> Train <strong>${data.train_no}</strong> suffered <strong>${m.grossDelay.toFixed(1)} minutes</strong> of compound physical disturbance (${p.PrimaryDelay.toFixed(1)}m primary + ${c.CascadeDelay.toFixed(1)}m cascading ripple). The timetable provides <strong>${data.EA_allotted_mins.toFixed(1)} minutes</strong> of built-in recovery buffer (EA). Because the gross delay exceeds the buffer by <strong>${m.NetDelay.toFixed(1)} minutes</strong>, the train will reach the destination at <strong>${etaStr}</strong> (<strong>${m.NetDelay.toFixed(1)} mins late</strong>).
        `;
      } else {
        explBox.className = 'explanation-box';
        explText.innerHTML = `
          <strong>On-Time Arrival:</strong> Train <strong>${data.train_no}</strong> accumulated <strong>${m.grossDelay.toFixed(1)} minutes</strong> of gross delay (${p.PrimaryDelay.toFixed(1)}m primary + ${c.CascadeDelay.toFixed(1)}m cascading ripple). However, Indian Railways timetable allocates <strong>${data.EA_allotted_mins.toFixed(1)} minutes</strong> of recovery buffer (EA) on this corridor. Because the extra time comfortably absorbs the entire perturbation, the net arrival delay is <strong>0 minutes</strong> and the train arrives <strong>ON TIME at ${schedStr}</strong>.
        `;
      }

      // Detailed Lists
      document.getElementById('primarySumTag').textContent = `+${p.PrimaryDelay.toFixed(1)}m`;
      document.getElementById('itemWeatherVal').textContent = `${p.d_weather_tsr_priority.toFixed(1)} mins`;
      document.getElementById('itemKineticVal').textContent = `${p.d_accel_decel.toFixed(1)} mins`;

      document.getElementById('cascadeSumTag').textContent = `+${c.CascadeDelay.toFixed(1)}m`;
      document.getElementById('itemHeadwayVal').textContent = `${c.d_headway.toFixed(1)} mins`;
      document.getElementById('itemJunctionVal').textContent = `${c.d_junction.toFixed(1)} mins`;
      document.getElementById('itemTurnaroundVal').textContent = `${c.d_turnaround.toFixed(1)} mins`;
      document.getElementById('itemCrossingVal').textContent = `${c.d_crossing.toFixed(1)} mins`;
      document.getElementById('itemCrewVal').textContent = `${c.d_crew.toFixed(1)} mins`;

    } catch (err) {
      console.error('Error refreshing journey:', err);
    }
  }

  // Refresh National Fleet KPIs
  async function refreshFleetKpis() {
    try {
      const url = `/api/fleet_summary?weather=${state.weather}&congestion=${state.congestion}&tsr=${state.tsr}`;
      const res = await fetch(url);
      const kpi = await res.json();

      document.getElementById('kpiPunctuality').textContent = `${kpi.punctuality_pct.toFixed(1)}%`;
      document.getElementById('kpiAvgPrimary').textContent = `${kpi.avg_primary_mins.toFixed(1)}m`;
      document.getElementById('kpiAvgCascade').textContent = `${kpi.avg_cascade_mins.toFixed(1)}m`;
      document.getElementById('kpiAvgEA').textContent = `${kpi.avg_ea_buffer_mins.toFixed(1)}m`;
      document.getElementById('kpiAvgNet').textContent = `${kpi.avg_net_delay_mins.toFixed(1)}m`;
    } catch (err) {
      console.error('Error refreshing KPIs:', err);
    }
  }

  // Refresh Key Trains Comparison Table
  async function refreshTable() {
    try {
      const url = `/api/flagship_table?weather=${state.weather}&congestion=${state.congestion}&tsr=${state.tsr}`;
      const res = await fetch(url);
      const rows = await res.json();
      renderTable(rows);
    } catch (err) {
      console.error('Error refreshing table:', err);
    }
  }

  function renderTable(rows) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    const filter = (tableSearchFilter.value || '').trim().toUpperCase();

    rows.forEach(r => {
      if (filter && !r.train_no.includes(filter) && !r.train_name.toUpperCase().includes(filter)) {
        return;
      }

      const tr = document.createElement('tr');
      const isLate = r.status === 'LATE';
      tr.innerHTML = `
        <td><strong>${r.train_no}</strong></td>
        <td>${r.train_name}</td>
        <td><span style="font-size:10px; padding:2px 4px; background:#f1f5f9; border-radius:3px;">${r.train_tier}</span></td>
        <td style="color:#64748b;">${r.route}</td>
        <td>+${r.primary.toFixed(1)}m</td>
        <td>+${r.cascade.toFixed(1)}m</td>
        <td><strong>+${r.gross.toFixed(1)}m</strong></td>
        <td style="color:#059669;">${r.ea.toFixed(1)}m</td>
        <td><strong>+${r.net.toFixed(1)}m</strong></td>
        <td><span class="badge-status ${isLate ? 'late' : 'on-time'}">${r.status}</span></td>
      `;

      tr.addEventListener('click', () => {
        state.selectedTrain = r.train_no;
        presetChips.forEach(c => c.classList.remove('active'));
        refreshTrainJourney();
        compoundEtaSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      tbody.appendChild(tr);
    });
  }

  tableSearchFilter.addEventListener('input', () => {
    refreshTable();
  });

  // Master Refresh
  function refreshDashboard() {
    refreshTrainJourney();
    refreshFleetKpis();
    refreshTable();
  }

  // Initial Load
  refreshDashboard();
});
