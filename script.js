// ==================== 数据管理模块 ====================
class BlogDatabase {
    constructor() {
        this.storageKey = 'blogs';
        this.commentsKey = 'comments';
        this.contactsKey = 'contacts';
        this.initDefaultData();
    }

    // 初始化默认数据
    async initDefaultData() {
        // 内置默认博客数据
        const defaultBlogs = [
            {
                "id": 1,
                "title": "Welcome to My Blog",
                "excerpt": "这是我的第一篇博客，标志着我建立了个人网站。这里将分享我的技术见解和生活感悟。",
                "date": "2026-02-03",
                "category": "生活",
                "tags": ["欢迎", "随笔"],
                "content": `
                    <div class="blog-content">
                        <p>你好！欢迎来到我的个人博客。</p>
                        <p>这是一个使用原生 HTML/CSS/JS 构建的简单博客系统。我将在这里记录我的学习历程、技术分享以及生活点滴。</p>
                        
                        <h3>关于本站</h3>
                        <p>本站旨在作为一个简洁的展示平台，分享关于：</p>
                        <ul>
                            <li>大模型 (LLM) 技术</li>
                            <li>AI for Science</li>
                            <li>搜索推荐算法</li>
                            <li>日常生活思考</li>
                        </ul>
                        <p>感谢你的访问！</p>
                    </div>
                `.trim()
            }
        ];

        // 如果没有本地数据，或者为了演示总是重置（这里保留本地数据的逻辑）
        if (!localStorage.getItem(this.storageKey)) {
            this.setBlogs(defaultBlogs);
        }
        // 为了确保最新代码生效，这里强制更新一下（如果只是开发阶段）
        // 实际使用时，可能希望保留用户更改，但既然删除了posts文件夹，我们假设使用内置数据
        this.setBlogs(defaultBlogs); 
        
        window.dispatchEvent(new Event('blogsLoaded'));
    }

    // 获取所有博客
    getBlogs() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    // 保存博客列表
    setBlogs(blogs) {
        localStorage.setItem(this.storageKey, JSON.stringify(blogs));
    }

    // 根据ID获取单个博客
    async getBlogById(id) {
        const blogs = this.getBlogs();
        const blog = blogs.find(blog => blog.id == id);
        return blog;
    }

    // 获取评论
    getComments(blogId) {
        const data = localStorage.getItem(`${this.commentsKey}_${blogId}`);
        return data ? JSON.parse(data) : [];
    }

    // 添加评论
    addComment(blogId, comment) {
        const comments = this.getComments(blogId);
        const newComment = {
            id: comments.length + 1,
            ...comment,
            date: new Date().toLocaleDateString('zh-CN')
        };
        comments.push(newComment);
        localStorage.setItem(`${this.commentsKey}_${blogId}`, JSON.stringify(comments));
        return newComment;
    }

    // 保存联系表单
    saveContact(contact) {
        const contacts = this.getContacts();
        const newContact = {
            id: contacts.length + 1,
            ...contact,
            date: new Date().toLocaleDateString('zh-CN'),
            time: new Date().toLocaleTimeString('zh-CN')
        };
        contacts.push(newContact);
        localStorage.setItem(this.contactsKey, JSON.stringify(contacts));
        return newContact;
    }

    // 获取所有联系信息
    getContacts() {
        const data = localStorage.getItem(this.contactsKey);
        return data ? JSON.parse(data) : [];
    }
}

// ==================== 应用程序主类 ====================
class BlogApp {
    constructor() {
        this.db = new BlogDatabase();
        this.currentPage = 'home';
        this.currentBlogId = null;
        this.init();
    }

    // 初始化应用
    init() {
        this.setupEventListeners();
        this.loadTheme();
        this.loadPage('home');
    }

    // 设置事件监听器
    setupEventListeners() {
        // 导航链接
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.loadPage(page);
            });
        });

        // 主题切换
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // 哈希路由
        window.addEventListener('hashchange', () => {
            this.handleRouting();
        });

        // 搜索和筛选
        document.getElementById('searchInput').addEventListener('input', () => {
            this.filterBlogs();
        });

        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.filterBlogs();
        });

        // 评论表单
        document.getElementById('commentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitComment();
        });

        // 返回按钮
        if (document.getElementById('backBtn')) {
            document.getElementById('backBtn').addEventListener('click', () => {
                this.loadPage('home');
            });
        }

        // 联系表单
        document.getElementById('contactForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitContact();
        });
    }

    // 加载页面
    async loadPage(page) {
        // 确保数据已加载
        if (!this.db.getBlogs().length) {
            await new Promise(resolve => {
                const handler = () => {
                   window.removeEventListener('blogsLoaded', handler);
                   resolve();
               };
                if (this.db.getBlogs().length) {
                    resolve();
                } else {
                    window.addEventListener('blogsLoaded', handler);
                }
            });
        }

        // 移除所有活跃类
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

        // 添加活跃类
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.classList.add('active');
        }

        // 更新导航活跃状态
        const navLink = document.querySelector(`[data-page="${page}"]`);
        if (navLink) {
            navLink.classList.add('active');
        }

        this.currentPage = page;

        // 加载页面特定内容
        if (page === 'home') {
            this.loadBlogList();
        } else if (page === 'about') {
            this.loadSpecialPage('about');
        } else if (page === 'essays') {
            this.loadCategoryList('随笔', 'essaysList');
        } else if (page === 'engineering') {
            this.loadCategoryList('工程', 'engineeringList');
        } else if (page === 'research') {
            this.loadCategoryList('科研', 'researchList');
        }

        window.location.hash = `#/${page === 'home' ? '' : page}`;
    }

    // 加载特殊页面（如About）- 使用全局JS变量
    loadSpecialPage(pageId) {
        const container = document.getElementById(`${pageId}-page`);
        if (container && window.pageContents && window.pageContents[pageId]) {
            container.innerHTML = window.pageContents[pageId];
            // Safari/部分浏览器对 <details>/<summary> 的行为可能不一致。
            // 在插入 HTML 后增强 details 行为，确保 summary 点击可切换 open 状态。
            try {
                this.enhanceDetails(container);
            } catch (e) {
                console.warn('enhanceDetails failed:', e);
            }
        }
    }

    // 增强 <details>/<summary> 在不同浏览器中的行为（Safari 兼容性回退）
    enhanceDetails(root) {
        if (!root) return;
        const detailsList = root.querySelectorAll('details');
        detailsList.forEach(d => {
            const summary = d.querySelector('summary');
            if (!summary) return;

            // 如果浏览器原生支持 details，但 Safari 某些版本对 innerHTML 动态插入后的交互有问题，添加点击处理器作为回退。
            // 该处理器仅在 summary 点击时切换 open 属性，不阻断默认键盘交互。
            summary.addEventListener('click', (ev) => {
                // 在某些情况下事件会在内部元素上触发，确保目标在 summary 中
                if (!summary.contains(ev.target)) return;
                // 切换 open 状态
                try {
                    d.open = !d.open;
                } catch (e) {
                    // 忽略错误
                }
            });

            // 确保折叠内容初始化样式正确（部分浏览器需要显式隐藏）
            const body = Array.from(d.children).find(c => c.tagName.toLowerCase() !== 'summary');
            if (body) {
                // 使用 aria 隐藏以提高可访问性
                body.setAttribute('aria-hidden', d.hasAttribute('open') ? 'false' : 'true');
                // 监听 open 属性变化，保持 aria-hidden 同步
                const observer = new MutationObserver(() => {
                    body.setAttribute('aria-hidden', d.hasAttribute('open') ? 'false' : 'true');
                });
                observer.observe(d, { attributes: true, attributeFilter: ['open'] });
            }
        });
    }

    // 加载分类列表
    loadCategoryList(category, elementId) {
        const blogs = this.db.getBlogs().filter(blog => blog.category === category && blog.type !== 'page');
        const container = document.getElementById(elementId);
        container.innerHTML = '';

        if (blogs.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">暂无内容</p>';
            return;
        }

        blogs.forEach(blog => {
            const card = this.createBlogCard(blog);
            container.appendChild(card);
        });
    }

    // 加载博客列表
    loadBlogList() {
        const blogs = this.db.getBlogs().filter(blog => blog.type !== 'page');
        const blogList = document.getElementById('blogList');
        blogList.innerHTML = '';

        blogs.forEach(blog => {
            const card = this.createBlogCard(blog);
            blogList.appendChild(card);
        });
    }

    // 创建博客卡片
    createBlogCard(blog) {
        const card = document.createElement('div');
        card.className = 'blog-card';
        card.innerHTML = `
            <div class="blog-card-image">📰</div>
            <div class="blog-card-content">
                <h3 class="blog-card-title">${this.escapeHtml(blog.title)}</h3>
                <span class="blog-card-category">${blog.category}</span>
                <p class="blog-card-excerpt">${this.escapeHtml(blog.excerpt)}</p>
                <div class="blog-card-meta">
                    <span>📅 ${blog.date}</span>
                    <span>⏱️ ${blog.readTime}</span>
                </div>
            </div>
        `;
        card.addEventListener('click', () => {
            this.loadBlogDetail(blog.id);
        });
        return card;
    }

    // 加载博客详情
    async loadBlogDetail(blogId) {
        const blog = await this.db.getBlogById(blogId);
        if (!blog) return;

        this.currentBlogId = blogId;

        // 显示详情页
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('detail-page').classList.add('active');

        // 更新导航
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

        // 填充详情内容
        const detailContainer = document.getElementById('blogDetail');
        const author = blog.author || 'Feng';
        const readTime = blog.readTime || '3 min read';
        
        detailContainer.innerHTML = `
            <h1>${this.escapeHtml(blog.title)}</h1>
            <div class="blog-detail-meta">
                <span>✍️ 作者: ${author}</span>
                <span>📅 ${blog.date}</span>
                <span>⏱️ ${readTime}</span>
                <span>🏷️ ${blog.category}</span>
            </div>
            <div class="blog-detail-content">
                ${this.renderContent(blog.content)}
            </div>
        `;

        // 清空评论表单
        document.getElementById('commentForm').reset();

        // 加载评论
        this.loadComments(blogId);

        window.location.hash = `#/blog/${blogId}`;
    }

    // 加载评论
    loadComments(blogId) {
        const comments = this.db.getComments(blogId);
        const commentsList = document.getElementById('commentsList');
        const commentCount = document.getElementById('commentCount');

        commentCount.textContent = comments.length;

        if (comments.length === 0) {
            commentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">暂无评论，成为第一个评论者吧！</p>';
            return;
        }

        commentsList.innerHTML = '';
        comments.forEach(comment => {
            const item = document.createElement('div');
            item.className = 'comment-item';
            item.innerHTML = `
                <div class="comment-author">${this.escapeHtml(comment.name)}</div>
                <div class="comment-time">${comment.date}</div>
                <div class="comment-text">${this.escapeHtml(comment.text)}</div>
            `;
            commentsList.appendChild(item);
        });
    }

    // 提交评论
    submitComment() {
        const name = document.getElementById('commenterName').value.trim();
        const text = document.getElementById('commentText').value.trim();

        if (!name || !text) {
            this.showToast('请填写所有字段', 'error');
            return;
        }

        try {
            this.db.addComment(this.currentBlogId, { name, text });
            document.getElementById('commentForm').reset();
            this.loadComments(this.currentBlogId);
            this.showToast('评论已发表！', 'success');
        } catch (error) {
            console.error('评论提交失败:', error);
            this.showToast('评论提交失败，请重试', 'error');
        }
    }

    // 提交联系表单
    submitContact() {
        const name = document.getElementById('contactName').value.trim();
        const email = document.getElementById('contactEmail').value.trim();
        const subject = document.getElementById('contactSubject').value.trim();
        const message = document.getElementById('contactMessage').value.trim();

        if (!name || !email || !subject || !message) {
            this.showToast('请填写所有字段', 'error');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showToast('请输入有效的邮箱地址', 'error');
            return;
        }

        try {
            this.db.saveContact({ name, email, subject, message });
            document.getElementById('contactForm').reset();
            this.showToast('消息已发送！感谢您的联系。', 'success');
        } catch (error) {
            console.error('提交失败:', error);
            this.showToast('提交失败，请重试', 'error');
        }
    }

    // 筛选博客
    filterBlogs() {
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();
        const selectedCategory = document.getElementById('categoryFilter').value;
        const blogs = this.db.getBlogs();

        const filtered = blogs.filter(blog => {
            const matchesSearch = blog.title.toLowerCase().includes(searchQuery) ||
                                blog.excerpt.toLowerCase().includes(searchQuery) ||
                                blog.content.toLowerCase().includes(searchQuery);
            const matchesCategory = !selectedCategory || blog.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });

        const blogList = document.getElementById('blogList');
        blogList.innerHTML = '';

        if (filtered.length === 0) {
            blogList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">没有找到匹配的博客</p>';
            return;
        }

        filtered.forEach(blog => {
            const card = this.createBlogCard(blog);
            blogList.appendChild(card);
        });
    }

    // 主题切换
    toggleTheme() {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        this.updateThemeIcon();
    }

    // 加载主题设置
    loadTheme() {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        }
        this.updateThemeIcon();
    }

    // 更新主题图标
    updateThemeIcon() {
        const icon = document.querySelector('.theme-icon');
        const isDarkMode = document.body.classList.contains('dark-mode');
        icon.textContent = isDarkMode ? '☀️' : '🌙';
    }

    // 处理路由
    handleRouting() {
        const hash = window.location.hash.slice(2);
        if (hash.startsWith('blog/')) {
            const blogId = hash.split('/')[1];
            this.loadBlogDetail(blogId);
        } else if (hash === '' || hash === '/') {
            this.loadPage('home');
        } else {
            this.loadPage(hash);
        }
    }

    // 显示提示信息
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // HTML转义（防止XSS）
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
    }

    // 渲染内容（直接返回HTML内容，不再转义，因为内容是内置的可信HTML）
    renderContent(content) {
        if (!content) return '<p>内容加载中...</p>';
        return content;
    }

    // 验证邮箱
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// ==================== 初始化应用 ====================
document.addEventListener('DOMContentLoaded', () => {
    new BlogApp();
});
