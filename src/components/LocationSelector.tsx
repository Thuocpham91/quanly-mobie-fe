import React, { useState, useEffect } from 'react';
import { Navigation, Loader2 } from 'lucide-react';
import locationsApi from '../api/locations';
import type { LocationItem } from '../api/locations';

interface LocationSelectorProps {
  onLocationChange: (location: {
    province?: LocationItem;
    district?: LocationItem;
    ward?: LocationItem;
    fullAddress?: string;
  }) => void;
  initialProvinceId?: number;
  initialDistrictId?: number;
  initialWardId?: number;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ 
  onLocationChange, 
  initialProvinceId, 
  initialDistrictId, 
  initialWardId 
}) => {
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [districts, setDistricts] = useState<LocationItem[]>([]);
  const [wards, setWards] = useState<LocationItem[]>([]);

  const [selectedProvince, setSelectedProvince] = useState<number | ''>(initialProvinceId || '');
  const [selectedDistrict, setSelectedDistrict] = useState<number | ''>(initialDistrictId || '');
  const [selectedWard, setSelectedWard] = useState<number | ''>(initialWardId || '');
  
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState('');

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const data = await locationsApi.getProvinces();
        setProvinces(data);
      } catch (err) {
        console.error('Failed to fetch provinces', err);
      }
    };
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (initialProvinceId) setSelectedProvince(initialProvinceId);
    if (initialDistrictId) setSelectedDistrict(initialDistrictId);
    if (initialWardId) setSelectedWard(initialWardId);
  }, [initialProvinceId, initialDistrictId, initialWardId]);

  useEffect(() => {
    if (selectedProvince) {
      const fetchDistricts = async () => {
        try {
          const data = await locationsApi.getDistricts(selectedProvince as number);
          setDistricts(data);
          setWards([]);
          
          // Only clear if the province changed and it's not the initial value
          if (selectedProvince !== initialProvinceId) {
            setSelectedDistrict('');
            setSelectedWard('');
          }
        } catch (err) {
          console.error('Failed to fetch districts', err);
        }
      };
      fetchDistricts();
    } else {
      setDistricts([]);
      setWards([]);
    }
  }, [selectedProvince]);

  useEffect(() => {
    if (selectedDistrict) {
      const fetchWards = async () => {
        try {
          const data = await locationsApi.getWards(selectedDistrict as number);
          setWards(data);
          
          // Only clear if the district changed and it's not the initial value
          if (selectedDistrict !== initialDistrictId) {
            setSelectedWard('');
          }
        } catch (err) {
          console.error('Failed to fetch wards', err);
        }
      };
      fetchWards();
    } else {
      setWards([]);
    }
  }, [selectedDistrict]);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? parseInt(e.target.value) : '';
    setSelectedProvince(id);
    const province = provinces.find(p => p.id === id);
    onLocationChange({ province, district: undefined, ward: undefined });
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? parseInt(e.target.value) : '';
    setSelectedDistrict(id);
    const province = provinces.find(p => p.id === selectedProvince);
    const district = districts.find(d => d.id === id);
    onLocationChange({ province, district, ward: undefined });
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? parseInt(e.target.value) : '';
    setSelectedWard(id);
    const province = provinces.find(p => p.id === selectedProvince);
    const district = districts.find(d => d.id === selectedDistrict);
    const ward = wards.find(w => w.id === id);
    onLocationChange({ province, district, ward });
  };

  const detectLocation = () => {
    setIsDetecting(true);
    setDetectError('');

    if (!navigator.geolocation) {
      setDetectError('Geolocation is not supported by your browser');
      setIsDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse geocoding using Nominatim (OpenStreetMap)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          
          if (data.display_name) {
            onLocationChange({ fullAddress: data.display_name });
          }
        } catch (err) {
          setDetectError('Could not determine address from coordinates');
        } finally {
          setIsDetecting(false);
        }
      },
      (error) => {
        setDetectError(error.message);
        setIsDetecting(false);
      }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
        {/* Province */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', color: '#64748b' }}>
            Tỉnh / Thành phố
          </label>
          <select
            value={selectedProvince}
            onChange={handleProvinceChange}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          >
            <option value="">-- Chọn --</option>
            {provinces.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', color: '#64748b' }}>
            Quận / Huyện
          </label>
          <select
            value={selectedDistrict}
            onChange={handleDistrictChange}
            disabled={!selectedProvince}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              fontSize: '0.875rem',
              outline: 'none',
              backgroundColor: !selectedProvince ? '#f8fafc' : 'white'
            }}
          >
            <option value="">-- Chọn --</option>
            {districts.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Ward */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', color: '#64748b' }}>
            Phường / Xã
          </label>
          <select
            value={selectedWard}
            onChange={handleWardChange}
            disabled={!selectedDistrict}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              fontSize: '0.875rem',
              outline: 'none',
              backgroundColor: !selectedDistrict ? '#f8fafc' : 'white'
            }}
          >
            <option value="">-- Chọn --</option>
            {wards.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={detectLocation}
          disabled={isDetecting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: 'var(--primary)',
            background: 'none',
            padding: '0',
            fontWeight: '600'
          }}
        >
          {isDetecting ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
          Lấy vị trí hiện tại
        </button>
        {detectError && (
          <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{detectError}</span>
        )}
      </div>
    </div>
  );
};

export default LocationSelector;
