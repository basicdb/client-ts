import React from 'react';
import * as Avatar from '@radix-ui/react-avatar';
import * as Popover from '@radix-ui/react-popover';

const LoginButton = () => {
  return (
    <Popover.Root>
      {/* Trigger: Avatar that will be clicked */}
      <Popover.Trigger asChild>
        <Avatar.Root style={avatarContainerStyle}>
          <Avatar.Image
            src="https://via.placeholder.com/150"
            alt="User Avatar"
            style={avatarImageStyle}
          />
          <Avatar.Fallback delayMs={600} style={avatarFallbackStyle}>
            U
          </Avatar.Fallback>
        </Avatar.Root>
      </Popover.Trigger>

      {/* Popover content */}
      <Popover.Portal>
        <Popover.Content style={popoverContentStyle} sideOffset={10}>
          <p style={{ marginBottom: '10px' }}>Hello, User!</p>
          <button style={buttonStyle}>Logout</button>
          <Popover.Arrow style={popoverArrowStyle} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

// Basic styles
const avatarContainerStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: '100%',
  backgroundColor: '#ccc',
  cursor: 'pointer',
};

const avatarImageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '100%',
  objectFit: 'cover',
};

const avatarFallbackStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '100%',
  backgroundColor: '#007bff',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '20px',
};

const popoverContentStyle: React.CSSProperties = {
  padding: '20px',
  borderRadius: '8px',
  backgroundColor: 'white',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#007bff',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

const popoverArrowStyle: React.CSSProperties = {
  fill: 'white',
};

export default LoginButton;
