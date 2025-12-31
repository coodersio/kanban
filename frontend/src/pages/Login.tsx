import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Lock, User } from "lucide-react";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include',  // 重要：允许浏览器保存和发送cookie
            });

            if (res.ok) {
                window.location.href = '/dashboard';
            } else {
                const data = await res.json();
                setError(data.message || '登录失败，请检查用户名和密码');
            }
        } catch (err) {
            setError('网络错误，请稍后重试');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
            <Card className="w-[420px] border shadow-lg">
                <CardHeader className="space-y-4 flex flex-col items-center pb-6 pt-8">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center shadow-md">
                            <LayoutDashboard className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-foreground">项目看板</h1>
                    </div>
                    <CardDescription className="text-base text-muted-foreground">
                        登录到您的账户
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                    <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-sm font-medium">
                                用户名
                            </Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="请输入用户名"
                                    className="h-11 pl-10"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    autoFocus
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">
                                密码
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="请输入密码"
                                    className="h-11 pl-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md">
                                {error}
                            </div>
                        )}

                        <Button
                            className="w-full h-11 text-base font-medium mt-6"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? "登录中..." : "登录"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
