import { useState } from 'react';
import { ChevronDown, Search, HelpCircle, BookOpen, CreditCard, User, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type FAQItem = {
    question: string;
    answer: string;
};

type FAQCategory = {
    id: string;
    icon: typeof HelpCircle;
    title: string;
    items: FAQItem[];
};

export default function FAQ() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('general');
    const [openItems, setOpenItems] = useState<string[]>([]);

    const categories: FAQCategory[] = [
        {
            id: 'general',
            icon: HelpCircle,
            title: 'Câu hỏi chung',
            items: [
                {
                    question: 'E-Learning là gì?',
                    answer: 'E-Learning là nền tảng học trực tuyến hàng đầu Việt Nam, cung cấp hàng nghìn khóa học chất lượng từ các giảng viên uy tín trong nhiều lĩnh vực khác nhau.',
                },
                {
                    question: 'Tôi có thể học trên những thiết bị nào?',
                    answer: 'Bạn có thể học trên mọi thiết bị có kết nối internet: máy tính, laptop, tablet, điện thoại thông minh. Chúng tôi có ứng dụng riêng cho iOS và Android.',
                },
                {
                    question: 'Khóa học có thời hạn không?',
                    answer: 'Sau khi mua, bạn có quyền truy cập khóa học vĩnh viễn. Bạn có thể học bất cứ lúc nào, ở bất cứ đâu, không giới hạn số lần xem.',
                },
                {
                    question: 'Tôi có nhận được chứng chỉ sau khi hoàn thành khóa học không?',
                    answer: 'Có! Sau khi hoàn thành khóa học, bạn sẽ nhận được chứng chỉ điện tử xác nhận hoàn thành. Chứng chỉ này có thể chia sẻ trên LinkedIn hoặc in ra.',
                },
            ],
        },
        {
            id: 'courses',
            icon: BookOpen,
            title: 'Về khóa học',
            items: [
                {
                    question: 'Làm sao để tìm khóa học phù hợp?',
                    answer: 'Bạn có thể sử dụng thanh tìm kiếm, lọc theo danh mục, hoặc xem các khóa học được đề xuất dựa trên sở thích của bạn. Mỗi khóa học đều có mô tả chi tiết và đánh giá từ học viên.',
                },
                {
                    question: 'Khóa học có được cập nhật không?',
                    answer: 'Có! Giảng viên thường xuyên cập nhật nội dung khóa học để đảm bảo thông tin luôn mới nhất. Bạn sẽ được truy cập tất cả các bản cập nhật miễn phí.',
                },
                {
                    question: 'Tôi có thể xem trước khóa học trước khi mua không?',
                    answer: 'Có, hầu hết các khóa học đều có video xem trước miễn phí. Bạn có thể xem để đánh giá chất lượng và phong cách giảng dạy trước khi quyết định mua.',
                },
                {
                    question: 'Làm sao để đặt câu hỏi cho giảng viên?',
                    answer: 'Mỗi khóa học đều có phần Q&A nơi bạn có thể đặt câu hỏi. Giảng viên và cộng đồng học viên sẽ hỗ trợ trả lời câu hỏi của bạn.',
                },
            ],
        },
        {
            id: 'payment',
            icon: CreditCard,
            title: 'Thanh toán',
            items: [
                {
                    question: 'Các hình thức thanh toán được chấp nhận?',
                    answer: 'Chúng tôi chấp nhận: Thẻ tín dụng/ghi nợ (Visa, Mastercard, JCB), Ví điện tử (MoMo, ZaloPay, VNPay), Chuyển khoản ngân hàng, và nhiều hình thức khác.',
                },
                {
                    question: 'Thanh toán có an toàn không?',
                    answer: 'Tuyệt đối an toàn! Chúng tôi sử dụng cổng thanh toán Stripe với tiêu chuẩn bảo mật PCI-DSS cao nhất. Thông tin thẻ của bạn được mã hóa và bảo vệ.',
                },
                {
                    question: 'Tôi có thể yêu cầu hoàn tiền không?',
                    answer: 'Có, chúng tôi có chính sách hoàn tiền trong vòng 30 ngày nếu bạn không hài lòng với khóa học. Vui lòng liên hệ hỗ trợ để được hướng dẫn.',
                },
                {
                    question: 'Có mã giảm giá không?',
                    answer: 'Có! Chúng tôi thường xuyên có các chương trình khuyến mãi. Đăng ký nhận bản tin để không bỏ lỡ các ưu đãi hấp dẫn.',
                },
            ],
        },
        {
            id: 'account',
            icon: User,
            title: 'Tài khoản',
            items: [
                {
                    question: 'Làm sao để đăng ký tài khoản?',
                    answer: 'Click vào nút "Đăng ký" ở góc phải màn hình, nhập email và mật khẩu. Bạn cũng có thể đăng ký nhanh bằng tài khoản Google.',
                },
                {
                    question: 'Tôi quên mật khẩu, phải làm sao?',
                    answer: 'Click vào "Quên mật khẩu" ở trang đăng nhập, nhập email đã đăng ký. Chúng tôi sẽ gửi link đặt lại mật khẩu cho bạn.',
                },
                {
                    question: 'Làm sao để thay đổi thông tin cá nhân?',
                    answer: 'Đăng nhập vào tài khoản, vào phần "Cài đặt" hoặc "Hồ sơ" để cập nhật thông tin cá nhân, ảnh đại diện, và các cài đặt khác.',
                },
                {
                    question: 'Tôi có thể xóa tài khoản không?',
                    answer: 'Có, bạn có thể yêu cầu xóa tài khoản bất cứ lúc nào. Vui lòng liên hệ đội ngũ hỗ trợ để được hướng dẫn chi tiết.',
                },
            ],
        },
        {
            id: 'privacy',
            icon: Shield,
            title: 'Bảo mật & Quyền riêng tư',
            items: [
                {
                    question: 'Thông tin cá nhân của tôi có được bảo mật không?',
                    answer: 'Có! Chúng tôi cam kết bảo mật thông tin cá nhân của bạn theo tiêu chuẩn cao nhất. Xem chi tiết tại trang Chính sách bảo mật.',
                },
                {
                    question: 'E-Learning có chia sẻ thông tin của tôi cho bên thứ ba không?',
                    answer: 'Không! Chúng tôi không bao giờ bán hoặc chia sẻ thông tin cá nhân của bạn cho bên thứ ba vì mục đích thương mại.',
                },
                {
                    question: 'Làm sao để bảo vệ tài khoản của tôi?',
                    answer: 'Sử dụng mật khẩu mạnh, bật xác thực 2 lớp, không chia sẻ thông tin đăng nhập, và đăng xuất khi sử dụng thiết bị công cộng.',
                },
            ],
        },
    ];

    const toggleItem = (id: string) => {
        setOpenItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const filteredCategories = categories.map(cat => ({
        ...cat,
        items: cat.items.filter(
            item =>
                item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ),
    })).filter(cat => cat.items.length > 0 || searchQuery === '');

    const currentCategory = filteredCategories.find(c => c.id === activeCategory) || filteredCategories[0];

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Hero */}
            <section className="py-12 sm:py-16 bg-red-600">
                <div className="container mx-auto px-4 sm:px-6 text-center text-white">
                    <HelpCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 sm:mb-6 opacity-80" />
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">Câu hỏi thường gặp</h1>
                    <p className="text-base sm:text-xl text-red-100 max-w-2xl mx-auto mb-6 sm:mb-8">
                        Tìm câu trả lời cho các thắc mắc phổ biến về E-Learning
                    </p>

                    {/* Search */}
                    <div className="max-w-xl mx-auto relative">
                        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                        <Input
                            type="text"
                            placeholder="Tìm kiếm câu hỏi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 sm:pl-12 h-12 sm:h-14 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                        />
                    </div>
                </div>
            </section>

            {/* FAQ Content */}
            <section className="py-10 sm:py-16">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 max-w-6xl mx-auto">
                        {/* Categories Sidebar */}
                        <div className="lg:w-64 shrink-0">
                            <Card className="p-4 lg:sticky lg:top-24">
                                <h3 className="font-semibold text-zinc-900 dark:text-white mb-3 sm:mb-4">Danh mục</h3>
                                <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-left transition-colors ${activeCategory === cat.id
                                                    ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                                }`}
                                        >
                                            <cat.icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                                            <span className="text-xs sm:text-sm font-medium truncate">{cat.title}</span>
                                        </button>
                                    ))}
                                </nav>
                            </Card>
                        </div>

                        {/* FAQ Items */}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-4 sm:mb-6">
                                {currentCategory?.title}
                            </h2>
                            <div className="space-y-3 sm:space-y-4">
                                {currentCategory?.items.map((item, index) => {
                                    const itemId = `${currentCategory.id}-${index}`;
                                    const isOpen = openItems.includes(itemId);
                                    return (
                                        <Card key={itemId} className="overflow-hidden">
                                            <button
                                                onClick={() => toggleItem(itemId)}
                                                className="w-full flex items-center justify-between p-4 sm:p-6 text-left gap-3"
                                            >
                                                <span className="font-medium text-sm sm:text-base text-zinc-900 dark:text-white">
                                                    {item.question}
                                                </span>
                                                <ChevronDown
                                                    className={`h-5 w-5 text-zinc-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''
                                                        }`}
                                                />
                                            </button>
                                            {isOpen && (
                                                <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3 sm:pt-4">
                                                    {item.answer}
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })}
                            </div>

                            {currentCategory?.items.length === 0 && (
                                <Card className="p-8 sm:p-12 text-center">
                                    <Search className="h-12 w-12 mx-auto mb-4 text-zinc-400" />
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                                        Không tìm thấy kết quả
                                    </h3>
                                    <p className="text-zinc-600 dark:text-zinc-400">
                                        Thử tìm kiếm với từ khóa khác hoặc liên hệ hỗ trợ
                                    </p>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}


