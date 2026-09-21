import { useLocation, useNavigate } from 'react-router-dom';
import LocationGate from '../components/location/LocationGate';
import { useAuth } from '../context/AuthContext';

export default function Location() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasRole } = useAuth();

  const finish = (coords) => {
    sessionStorage.setItem('janasetu:location-choice', coords ? 'granted' : 'skipped');
    if (coords) {
      sessionStorage.setItem('janasetu:coords', JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }));
    } else {
      sessionStorage.removeItem('janasetu:coords');
    }
    if (hasRole('ADMIN')) navigate('/admin', { replace: true });
    else if (hasRole('OFFICER')) navigate('/officer', { replace: true });
    else {
      const from = location.state?.from;
      navigate(from ? `${from.pathname}${from.search || ''}` : '/dashboard', { replace: true });
    }
  };

  return <LocationGate onContinue={finish} />;
}
