import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, Form, Input, message, Space, Typography } from 'antd';
import React, { useState } from 'react';
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

export const loginSchema = z.object({
  username: z.string().min(1, "Please input your username"),
  password: z.string().min(1, "Please input your password"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
    clearErrors,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      username: "",
      password: "",
    },
    shouldUnregister: false,
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    clearErrors();

    try {
      const res = await login(values.username, values.password);
      if (res.status === 200) {
        message.success("Login successful!");
      } else {
        message.error(res.message);
      }
    } catch (error: any) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="!w-full !max-w-md !shadow-2xl !border-0 !rounded-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserOutlined className="!text-2xl !text-white" />
          </div>
          <Title level={2} className="!mb-2">Welcome Back</Title>
          <Text type="secondary">Sign in to your account</Text>
        </div>

        <Form
          layout="vertical"
          size="large"
          onFinish={handleSubmit(onSubmit)}
          preserve={true}
        >
          {/* Username */}
          <Form.Item
            label="Username"
            validateStatus={errors.username ? "error" : ""}
            help={errors.username?.message}
          >
            <Controller
              name="username"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  prefix={<UserOutlined className="text-gray-400" />}
                  placeholder="Enter your username"
                  className="!rounded-lg !py-3"
                  disabled={loading}
                />
              )}
            />
          </Form.Item>

          {/* Password */}
          <Form.Item
            label="Password"
            validateStatus={errors.password ? "error" : ""}
            help={errors.password?.message}
          >
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="Enter your password"
                  className="!rounded-lg !py-3"
                  disabled={loading}
                />
              )}
            />
          </Form.Item>

          {/* Submit */}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="!w-full !h-12 !rounded-lg !text-base !font-medium"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center">
          <Space direction="vertical" size="small">
            <Text type="secondary" className="!text-xs">
              NNH
            </Text>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default Login;