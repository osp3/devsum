import React from 'react';

const PRIORITY_STYLES = {
  high: 'text-node-red border-node-red/30',
  medium: 'text-node-yellow border-node-yellow/40',
  low: 'text-steam border-steam/30',
};

const PriorityTag = ({ level }) => (
  <span className={`shrink-0 rounded border px-1.5 py-px font-geist-mono text-[10px] uppercase ${PRIORITY_STYLES[level] || PRIORITY_STYLES.low}`}>
    {level}
  </span>
);

export default PriorityTag;
