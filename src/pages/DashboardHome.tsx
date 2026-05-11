import React from 'react';
import { Dog, Users, Calendar, Activity } from 'lucide-react';

const DashboardHome: React.FC = () => {
  const stats = [
    { label: 'Total Pets', value: '124', icon: <Dog size={24} />, color: '#6366f1' },
    { label: 'Total Owners', value: '86', icon: <Users size={24} />, color: '#10b981' },
    { label: 'Appointments Today', value: '12', icon: <Calendar size={24} />, color: '#f59e0b' },
    { label: 'Active Treatments', value: '18', icon: <Activity size={24} />, color: '#ef4444' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Good morning, Dr. Nguyen</h1>
        <p style={{ color: '#64748b' }}>Here's what's happening in your clinic today.</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {stats.map((stat) => (
          <div key={stat.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ 
              backgroundColor: `${stat.color}15`, 
              color: stat.color, 
              padding: '1rem', 
              borderRadius: '1rem' 
            }}>
              {stat.icon}
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{stat.label}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Recent Appointments</h3>
          <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
            No appointments found for today.
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="btn-primary">Schedule Appointment</button>
            <button style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>Register New Pet</button>
            <button style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>Add New Owner</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
