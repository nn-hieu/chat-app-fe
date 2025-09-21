import React from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle="Sorry, this page does not exist"
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          Go back
        </Button>
      }
    />
  );
};

export default NotFound;
