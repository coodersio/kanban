import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    BookOpen,
    Zap,
    Calendar,
    FolderKanban,
    CheckSquare,
    LayoutGrid,
    Download
} from "lucide-react";

interface HelpDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        帮助文档
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="quick" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="quick">
                            <Zap className="h-4 w-4 mr-2" />
                            快速开始
                        </TabsTrigger>
                        <TabsTrigger value="guide">
                            <BookOpen className="h-4 w-4 mr-2" />
                            使用指南
                        </TabsTrigger>
                        <TabsTrigger value="faq">
                            <CheckSquare className="h-4 w-4 mr-2" />
                            常见问题
                        </TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[500px] mt-4">
                        {/* 快速开始 */}
                        <TabsContent value="quick" className="space-y-4 px-1">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">📋 每周工作流程</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex gap-3 p-3 bg-muted rounded-lg">
                                        <Calendar className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium">周一：创建迭代</p>
                                            <p className="text-muted-foreground mt-1">迭代管理 → 创建迭代 → 激活 → 添加项目到迭代</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 p-3 bg-muted rounded-lg">
                                        <LayoutGrid className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium">周二-周四：使用看板</p>
                                            <p className="text-muted-foreground mt-1">工作台 → 拖拽任务卡片 → 更新进度 → 记录风险</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 p-3 bg-muted rounded-lg">
                                        <Download className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium">周五：导出周报</p>
                                            <p className="text-muted-foreground mt-1">迭代管理 → 找到迭代 → 导出周报/导出个人周报</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                                    <h4 className="font-medium text-sm mb-2">💡 快速提示</h4>
                                    <ul className="text-sm text-muted-foreground space-y-1">
                                        <li>• 直接拖拽任务卡片比手动修改状态更快</li>
                                        <li>• 切换到列表视图可以批量编辑任务</li>
                                        <li>• 及时更新进度，不要等到周五</li>
                                    </ul>
                                </div>
                            </div>
                        </TabsContent>

                        {/* 使用指南 */}
                        <TabsContent value="guide" className="space-y-4 px-1">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-primary" />
                                        创建迭代
                                    </h3>
                                    <ol className="text-sm space-y-2 ml-7">
                                        <li>1. 点击左侧菜单「迭代管理」</li>
                                        <li>2. 点击右上角「+ 创建迭代」按钮</li>
                                        <li>3. 填写迭代编号（如 2025-01）和日期</li>
                                        <li>4. 保存后点击「激活」设为当前工作迭代</li>
                                    </ol>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <FolderKanban className="h-5 w-5 text-primary" />
                                        管理项目
                                    </h3>
                                    <ol className="text-sm space-y-2 ml-7">
                                        <li>1. 点击左侧菜单「项目管理」</li>
                                        <li>2. 点击「+ 新建项目」填写项目信息</li>
                                        <li>3. 保存后在项目右侧菜单选择「加入当前迭代」</li>
                                        <li>4. 现在可以在工作台看到这个项目了</li>
                                    </ol>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <CheckSquare className="h-5 w-5 text-primary" />
                                        添加任务
                                    </h3>
                                    <ol className="text-sm space-y-2 ml-7">
                                        <li>1. 在工作台选择项目</li>
                                        <li>2. 点击项目卡片右上角「···」菜单</li>
                                        <li>3. 选择「添加Story」或「添加Task」</li>
                                        <li>4. 填写标题、描述、负责人等信息</li>
                                    </ol>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <LayoutGrid className="h-5 w-5 text-primary" />
                                        使用看板
                                    </h3>
                                    <div className="text-sm space-y-2 ml-7">
                                        <p><strong>更新状态：</strong>直接拖动任务卡片到目标列</p>
                                        <p><strong>编辑任务：</strong>点击任务卡片打开编辑窗口</p>
                                        <p><strong>删除任务：</strong>点击卡片右上角 × 按钮</p>
                                        <div className="mt-3 p-3 bg-muted rounded text-muted-foreground">
                                            <p className="font-medium text-foreground mb-1">看板布局：</p>
                                            <p>• 未开始 - 计划要做的事</p>
                                            <p>• 进行中 - 正在做的事</p>
                                            <p>• 已完成 - 做完的事</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <Download className="h-5 w-5 text-primary" />
                                        导出周报
                                    </h3>
                                    <div className="text-sm space-y-2 ml-7">
                                        <p><strong>团队周报：</strong>迭代管理 → 选择迭代 → 导出周报</p>
                                        <p><strong>个人周报：</strong>迭代管理 → 选择迭代 → 导出个人周报</p>
                                        <p className="text-muted-foreground mt-2">
                                            周报会自动汇总本周完成的工作、下周计划、风险和完成率统计
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* 常见问题 */}
                        <TabsContent value="faq" className="space-y-4 px-1">
                            <div className="space-y-4">
                                <div className="p-4 bg-muted rounded-lg">
                                    <h4 className="font-medium mb-2">Q: 如何修改密码？</h4>
                                    <p className="text-sm text-muted-foreground">
                                        A: 点击右上角头像 → 设置 → 修改密码
                                    </p>
                                </div>

                                <div className="p-4 bg-muted rounded-lg">
                                    <h4 className="font-medium mb-2">Q: 任务拖错了怎么办？</h4>
                                    <p className="text-sm text-muted-foreground">
                                        A: 再拖回去即可，或者点击卡片手动修改状态
                                    </p>
                                </div>

                                <div className="p-4 bg-muted rounded-lg">
                                    <h4 className="font-medium mb-2">Q: 看不到某个项目？</h4>
                                    <p className="text-sm text-muted-foreground">
                                        A: 确认项目已加入当前迭代（项目管理 → 加入当前迭代）
                                    </p>
                                </div>

                                <div className="p-4 bg-muted rounded-lg">
                                    <h4 className="font-medium mb-2">Q: 周报导出失败？</h4>
                                    <p className="text-sm text-muted-foreground">
                                        A: 检查网络连接，或稍后重试。如持续失败请联系管理员
                                    </p>
                                </div>

                                <div className="p-4 bg-muted rounded-lg">
                                    <h4 className="font-medium mb-2">Q: 如何查看历史迭代？</h4>
                                    <p className="text-sm text-muted-foreground">
                                        A: 工作台 → 迭代选择器 → 选择历史迭代查看
                                    </p>
                                </div>

                                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                                    <h4 className="font-medium mb-2">💁 需要更多帮助？</h4>
                                    <p className="text-sm text-muted-foreground">
                                        联系系统管理员或查看完整文档：
                                        <a href="/docs" className="text-primary hover:underline ml-1">用户操作手册</a>
                                    </p>
                                </div>
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
