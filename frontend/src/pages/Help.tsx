import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BookOpen,
    Zap,
    Calendar,
    FolderKanban,
    CheckSquare,
    LayoutGrid,
    Download,
    ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Help() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <BookOpen className="h-8 w-8 text-primary" />
                            帮助中心
                        </h1>
                        <p className="text-muted-foreground mt-1">快速上手，5分钟学会使用</p>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="quick" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-auto">
                        <TabsTrigger value="quick" className="flex items-center gap-2 py-3">
                            <Zap className="h-4 w-4" />
                            <span>快速开始</span>
                        </TabsTrigger>
                        <TabsTrigger value="guide" className="flex items-center gap-2 py-3">
                            <BookOpen className="h-4 w-4" />
                            <span>使用指南</span>
                        </TabsTrigger>
                        <TabsTrigger value="faq" className="flex items-center gap-2 py-3">
                            <CheckSquare className="h-4 w-4" />
                            <span>常见问题</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* 快速开始 */}
                    <TabsContent value="quick" className="space-y-6 mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>📋 每周工作流程</CardTitle>
                                <CardDescription>按照这个流程，轻松管理你的工作</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-4 p-4 bg-muted rounded-lg">
                                    <Calendar className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-2">周一：创建迭代</h3>
                                        <p className="text-muted-foreground">
                                            迭代管理 → 创建迭代 → 激活 → 添加项目到迭代
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-4 bg-muted rounded-lg">
                                    <LayoutGrid className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-2">周二-周四：使用看板</h3>
                                        <p className="text-muted-foreground">
                                            工作台 → 拖拽任务卡片 → 更新进度 → 记录风险
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-4 bg-muted rounded-lg">
                                    <Download className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-2">周五：导出周报</h3>
                                        <p className="text-muted-foreground">
                                            迭代管理 → 找到迭代 → 导出周报/导出个人周报
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-primary/5 border-primary/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    💡 快速提示
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary">•</span>
                                        <span>直接拖拽任务卡片比手动修改状态更快</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary">•</span>
                                        <span>切换到列表视图可以批量编辑任务</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary">•</span>
                                        <span>及时更新进度，不要等到周五</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary">•</span>
                                        <span>Story 是大的功能模块，Task 是具体要做的事情</span>
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* 使用指南 */}
                    <TabsContent value="guide" className="space-y-6 mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-primary" />
                                    创建迭代
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ol className="space-y-3 ml-4 list-decimal text-muted-foreground">
                                    <li>点击左侧菜单「迭代管理」</li>
                                    <li>点击右上角「+ 创建迭代」按钮</li>
                                    <li>填写迭代编号（如 2025-01）和日期</li>
                                    <li>保存后点击「激活」设为当前工作迭代</li>
                                </ol>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FolderKanban className="h-5 w-5 text-primary" />
                                    管理项目
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ol className="space-y-3 ml-4 list-decimal text-muted-foreground">
                                    <li>点击左侧菜单「项目管理」</li>
                                    <li>点击「+ 新建项目」填写项目信息</li>
                                    <li>保存后在项目右侧菜单选择「加入当前迭代」</li>
                                    <li>现在可以在工作台看到这个项目了</li>
                                </ol>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                    添加任务
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ol className="space-y-3 ml-4 list-decimal text-muted-foreground">
                                    <li>在工作台选择项目</li>
                                    <li>点击项目卡片右上角「···」菜单</li>
                                    <li>选择「添加Story」或「添加Task」</li>
                                    <li>填写标题、描述、负责人等信息</li>
                                </ol>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <LayoutGrid className="h-5 w-5 text-primary" />
                                    使用看板
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="font-medium mb-2">更新状态：</p>
                                    <p className="text-muted-foreground">直接拖动任务卡片到目标列</p>
                                </div>
                                <div>
                                    <p className="font-medium mb-2">编辑任务：</p>
                                    <p className="text-muted-foreground">点击任务卡片打开编辑窗口</p>
                                </div>
                                <div>
                                    <p className="font-medium mb-2">删除任务：</p>
                                    <p className="text-muted-foreground">点击卡片右上角 × 按钮</p>
                                </div>
                                <div className="p-4 bg-muted rounded-lg">
                                    <p className="font-medium mb-2">看板布局：</p>
                                    <ul className="space-y-1 text-muted-foreground">
                                        <li>• 未开始 - 计划要做的事</li>
                                        <li>• 进行中 - 正在做的事</li>
                                        <li>• 已完成 - 做完的事</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Download className="h-5 w-5 text-primary" />
                                    导出周报
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="font-medium mb-1">团队周报：</p>
                                    <p className="text-muted-foreground">迭代管理 → 选择迭代 → 导出周报</p>
                                </div>
                                <div>
                                    <p className="font-medium mb-1">个人周报：</p>
                                    <p className="text-muted-foreground">迭代管理 → 选择迭代 → 导出个人周报</p>
                                </div>
                                <p className="text-sm text-muted-foreground pt-2 border-t">
                                    周报会自动汇总本周完成的工作、下周计划、风险和完成率统计
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* 常见问题 */}
                    <TabsContent value="faq" className="space-y-4 mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>如何修改密码？</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    点击右上角头像 → 设置 → 修改密码
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>任务拖错了怎么办？</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    再拖回去即可，或者点击卡片手动修改状态
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>看不到某个项目？</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    确认项目已加入当前迭代（项目管理 → 加入当前迭代）
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>周报导出失败？</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    检查网络连接，或稍后重试。如持续失败请联系管理员
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>如何查看历史迭代？</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    工作台 → 迭代选择器 → 选择历史迭代查看
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>如何删除迭代或项目？</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    联系系统管理员，普通用户无删除权限（防止误删）
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-primary/5 border-primary/20">
                            <CardHeader>
                                <CardTitle>💁 需要更多帮助？</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    联系系统管理员获取技术支持
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
