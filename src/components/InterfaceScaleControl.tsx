import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Monitor, Check } from 'lucide-react';
import {
  useInterfaceScale,
  MIN_INTERFACE_SCALE,
  MAX_INTERFACE_SCALE,
  DEFAULT_INTERFACE_SCALE,
} from '../utils/interfaceScale';

interface Props {
  compact?: boolean;
  onClose?: () => void;
}

export const InterfaceScaleControl: React.FC<Props> = ({ compact = false, onClose }) => {
  const { scale, changeScale, presets } = useInterfaceScale();

  const handleStep = (delta: number) => {
    const next = Number((scale + delta).toFixed(2));
    changeScale(Math.min(MAX_INTERFACE_SCALE, Math.max(MIN_INTERFACE_SCALE, next)));
  };

  const currentPercent = Math.round(scale * 100);

  // Label description based on scale
  const getScaleLabel = (val: number) => {
    if (val <= 0.9) return 'Gọn gàng';
    if (val === 1.0) return 'Chuẩn';
    if (val <= 1.15) return 'Vừa';
    if (val <= 1.25) return 'To';
    return 'Rất to';
  };

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.8rem', fontWeight: '600' }}>
            <Monitor size={14} color="#6366f1" />
            <span>Cỡ giao diện</span>
          </div>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: '700',
            color: currentPercent > 100 ? '#4f46e5' : '#475569',
            backgroundColor: currentPercent > 100 ? '#eef2ff' : '#f1f5f9',
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            border: currentPercent > 100 ? '1px solid #c7d2fe' : '1px solid #e2e8f0'
          }}>
            {currentPercent}% • {getScaleLabel(scale)}
          </span>
        </div>

        {/* Preset quick buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.3rem' }}>
          {presets.filter(p => p.value >= 0.85).slice(0, 4).map((p) => {
            const isSelected = Math.abs(scale - p.value) < 0.03;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => changeScale(p.value)}
                style={{
                  padding: '0.3rem 0.2rem',
                  fontSize: '0.72rem',
                  fontWeight: isSelected ? '700' : '500',
                  borderRadius: '0.4rem',
                  border: isSelected ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#6366f1' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s'
                }}
                title={p.description}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Stepper & Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            disabled={scale <= MIN_INTERFACE_SCALE}
            onClick={() => handleStep(-0.05)}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: 'none',
              cursor: scale <= MIN_INTERFACE_SCALE ? 'not-allowed' : 'pointer',
              opacity: scale <= MIN_INTERFACE_SCALE ? 0.4 : 1,
              padding: 0
            }}
            title="Thu nhỏ"
          >
            <ZoomOut size={13} />
          </button>

          <input
            type="range"
            min={MIN_INTERFACE_SCALE}
            max={MAX_INTERFACE_SCALE}
            step="0.05"
            value={scale}
            onChange={(e) => changeScale(Number(e.target.value))}
            style={{
              flex: 1,
              height: '4px',
              accentColor: '#6366f1',
              cursor: 'pointer'
            }}
          />

          <button
            type="button"
            disabled={scale >= MAX_INTERFACE_SCALE}
            onClick={() => handleStep(0.05)}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: 'none',
              cursor: scale >= MAX_INTERFACE_SCALE ? 'not-allowed' : 'pointer',
              opacity: scale >= MAX_INTERFACE_SCALE ? 0.4 : 1,
              padding: 0
            }}
            title="Phóng to"
          >
            <ZoomIn size={13} />
          </button>

          {scale !== DEFAULT_INTERFACE_SCALE && (
            <button
              type="button"
              onClick={() => changeScale(DEFAULT_INTERFACE_SCALE)}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                border: 'none',
                cursor: 'pointer',
                padding: 0
              }}
              title="Đặt lại 100%"
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full / standard mode (used in Popover or Settings page)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '0.5rem',
            backgroundColor: '#eef2ff',
            color: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Monitor size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>
              Cỡ giao diện hiển thị
            </h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
              Tùy chỉnh độ lớn giao diện cho riêng bạn
            </p>
          </div>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.65rem',
          backgroundColor: '#eff6ff',
          borderRadius: '9999px',
          color: '#1d4ed8',
          fontSize: '0.82rem',
          fontWeight: '700',
          border: '1px solid #bfdbfe'
        }}>
          <span>{currentPercent}%</span>
          <span style={{ fontSize: '0.72rem', fontWeight: '500', opacity: 0.85 }}>
            ({getScaleLabel(scale)})
          </span>
        </div>
      </div>

      {/* Preset pills */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>
          Mức thu phóng nhanh:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
          {presets.map((p) => {
            const isSelected = Math.abs(scale - p.value) < 0.03;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => changeScale(p.value)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.45rem 0.2rem',
                  borderRadius: '0.5rem',
                  border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#4f46e5' : '#f8fafc',
                  color: isSelected ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: isSelected ? '0 2px 6px rgba(79, 70, 229, 0.25)' : 'none'
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{p.label}</span>
                <span style={{ fontSize: '0.65rem', opacity: isSelected ? 0.9 : 0.7 }}>
                  {p.description.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stepper + Range slider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        backgroundColor: '#f8fafc',
        padding: '0.75rem',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0'
      }}>
        <button
          type="button"
          onClick={() => handleStep(-0.05)}
          disabled={scale <= MIN_INTERFACE_SCALE}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#1e293b',
            cursor: scale <= MIN_INTERFACE_SCALE ? 'not-allowed' : 'pointer',
            opacity: scale <= MIN_INTERFACE_SCALE ? 0.4 : 1,
            padding: 0
          }}
          title="Giảm 5%"
        >
          <ZoomOut size={16} />
        </button>

        <input
          type="range"
          min={MIN_INTERFACE_SCALE}
          max={MAX_INTERFACE_SCALE}
          step="0.05"
          value={scale}
          onChange={(e) => changeScale(Number(e.target.value))}
          style={{
            flex: 1,
            accentColor: '#4f46e5',
            cursor: 'pointer',
            height: '6px'
          }}
        />

        <button
          type="button"
          onClick={() => handleStep(0.05)}
          disabled={scale >= MAX_INTERFACE_SCALE}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#1e293b',
            cursor: scale >= MAX_INTERFACE_SCALE ? 'not-allowed' : 'pointer',
            opacity: scale >= MAX_INTERFACE_SCALE ? 0.4 : 1,
            padding: 0
          }}
          title="Tăng 5%"
        >
          <ZoomIn size={16} />
        </button>

        <button
          type="button"
          onClick={() => changeScale(DEFAULT_INTERFACE_SCALE)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.4rem 0.65rem',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #bfdbfe',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
          title="Đặt lại mức chuẩn 100%"
        >
          <RotateCcw size={12} />
          <span>100%</span>
        </button>
      </div>

      {/* Footer Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.25rem' }}>
        <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
          * Thiết lập này được lưu riêng cho tài khoản của bạn.
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.35rem 0.75rem',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              borderRadius: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        )}
      </div>
    </div>
  );
};

export default InterfaceScaleControl;
