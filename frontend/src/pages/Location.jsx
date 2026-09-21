import { useNavigate } from 'react-router-dom';
import LocationGate from '../components/location/LocationGate';
import { useAuth } from '../context/AuthContext';

export default function Location() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const finish = (coords) => {
    sessionStorage.setItem('janasetu:location-choice', coords ? 'granted' : 'skipped');
    if (hasRole('ADMIN')) navigate('/admin', { replace: true });
    else if (hasRole('OFFICER')) navigate('/officer', { replace: true });
    else navigate('/dashboard', { replace: true });
  };

  return <LocationGate onContinue={finish} />;
}
