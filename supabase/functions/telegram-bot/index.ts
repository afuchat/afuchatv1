import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================
// TRANSLATIONS
// ============================================

type Lang = 'en' | 'es' | 'fr' | 'ar' | 'sw';

const translations: Record<Lang, Record<string, string>> = {
  en: {
    // General
    welcome: 'Welcome to <b>AfuChat</b>',
    welcomeBack: 'Welcome back, <b>{name}</b>',
    accountLinked: 'Account linked',
    linkToAccess: 'Link your account to access all features',
    mainMenu: 'Main Menu',
    back: 'Back',
    cancel: 'Cancel',
    confirm: 'Confirm',
    success: 'Success',
    error: 'Error',
    loading: 'Loading...',
    refresh: 'Refresh',
    
    // Balances
    nexa: 'Nexa',
    acoin: 'ACoin',
    grade: 'Grade',
    streak: 'Login Streak',
    days: 'days',
    
    // Main menu buttons
    feed: 'Feed',
    chats: 'Chats',
    wallet: 'Wallet',
    gifts: 'Gifts',
    profile: 'Profile',
    notifications: 'Notifications',
    stories: 'Stories',
    games: 'Games',
    leaderboard: 'Leaderboard',
    miniApps: 'Mini Apps',
    discoverUsers: 'Discover Users',
    settings: 'Settings',
    adminPanel: 'Admin Panel',
    
    // Unlinked menu
    linkAccount: 'Link Existing Account',
    createAccount: 'Create New Account',
    aboutAfuChat: 'About AfuChat',
    
    // Feed
    latestPosts: 'Latest Posts',
    noPosts: 'No posts yet. Be the first to post.',
    newPost: 'New Post',
    postWithImage: 'Post with Image',
    
    // Wallet
    yourWallet: 'Your Wallet',
    nexaBalance: 'Nexa Balance',
    acoinBalance: 'ACoin Balance',
    currentGrade: 'Current Grade',
    loginStreak: 'Login Streak',
    earnNexa: 'Earn Nexa by posting, engaging, and daily logins.',
    buyAcoinInfo: 'Buy ACoin via Telegram at $0.01 per ACoin.',
    buyAcoin: 'Buy ACoin',
    convertNexa: 'Convert Nexa to ACoin',
    sendNexa: 'Send Nexa',
    sendAcoin: 'Send ACoin',
    txHistory: 'Transaction History',
    redEnvelopes: 'Red Envelopes',
    
    // Gifts
    giftsTitle: 'Gifts',
    giftsDesc: 'Send beautiful gifts to your friends and earn rare collectibles.',
    browseGifts: 'Browse Gifts',
    myCollection: 'My Collection',
    marketplace: 'Marketplace',
    giftStats: 'Gift Statistics',
    
    // Chats
    yourChats: 'Your Chats',
    noChats: 'No conversations yet. Start chatting.',
    newChat: 'New Chat',
    createGroup: 'Create Group',
    createChannel: 'Create Channel',
    
    // Profile
    yourProfile: 'Your Profile',
    name: 'Name',
    handle: 'Handle',
    bio: 'Bio',
    country: 'Country',
    dateOfBirth: 'Date of Birth',
    privacy: 'Privacy',
    privateProfile: 'Private',
    publicProfile: 'Public',
    onlineStatus: 'Online Status',
    visible: 'Visible',
    hidden: 'Hidden',
    stats: 'Stats',
    followers: 'Followers',
    following: 'Following',
    editProfile: 'Edit Profile',
    changeAvatar: 'Change Avatar',
    viewStats: 'View Stats',
    privacySettings: 'Privacy Settings',
    
    // Edit profile
    editProfileTitle: 'Edit Profile',
    currentValues: 'Current values',
    selectToEdit: 'Select what you want to edit',
    editName: 'Edit Name',
    editUsername: 'Edit Username',
    editBio: 'Edit Bio',
    editCountry: 'Edit Country',
    editDob: 'Edit Date of Birth',
    
    // Privacy settings
    privacySettingsTitle: 'Privacy Settings',
    controlWhoCanSee: 'Control who can see your profile and activity.',
    currentSettings: 'Current Settings',
    makePublic: 'Make Profile Public',
    makePrivate: 'Make Profile Private',
    showOnlineStatus: 'Show Online Status',
    hideOnlineStatus: 'Hide Online Status',
    showBalance: 'Show Balance',
    hideBalance: 'Hide Balance',
    
    // Games
    gamesTitle: 'AfuChat Games',
    gamesDesc: 'Play games, earn Nexa, and compete with friends.',
    availableGames: 'Available Games',
    puzzleGame: 'Puzzle Game',
    memoryGame: 'Memory Game',
    trivia: 'Trivia',
    afuArena: 'Afu Arena',
    myScores: 'My Scores',
    
    // Leaderboard
    leaderboardTitle: 'Nexa Leaderboard',
    topPlayers: 'Top Players',
    yourRank: 'Your Rank',
    
    // Stories
    storiesTitle: 'Stories',
    noStories: 'No stories from people you follow. Create one.',
    recentStories: 'Recent Stories',
    createStory: 'Create Story',
    textStory: 'Text Story',
    storyViews: 'My Story Views',
    
    // Mini Apps
    miniAppsTitle: 'Mini Apps',
    accessMiniApps: 'Access AfuChat mini applications',
    shop: 'Shop',
    travel: 'Travel',
    foodDelivery: 'Food Delivery',
    rides: 'Rides',
    bookings: 'Bookings',
    afuMail: 'AfuMail',
    finance: 'Finance',
    events: 'Events',
    openInWeb: 'Open in Web',
    
    // Red Envelopes
    redEnvelopesTitle: 'Red Envelopes',
    sendLuckyMoney: 'Send lucky money to your friends.',
    yourBalance: 'Your balance',
    createRedEnvelope: 'Create Red Envelope',
    myEnvelopes: 'My Envelopes',
    history: 'History',
    
    // Notifications
    notificationsTitle: 'Notifications',
    noNotifications: 'No new notifications.',
    markAllRead: 'Mark All Read',
    notifSettings: 'Notification Settings',
    
    // Settings
    settingsTitle: 'Settings',
    manageAccount: 'Manage your AfuChat account settings.',
    notificationSettings: 'Notification Settings',
    appearance: 'Appearance',
    security: 'Security',
    unlinkAccount: 'Unlink Account',
    openWebApp: 'Open Web App',
    support: 'Support',
    deleteAccount: 'Delete Account',
    
    // Link account
    linkAccountTitle: 'Link Your AfuChat Account',
    secureVerification: 'Secure Verification',
    linkInstructions: 'To securely link your Telegram to your AfuChat account:\n\n1. Open the AfuChat app or website\n2. Go to <b>Settings → Security → Link Telegram</b>\n3. Click "Generate Link Code"\n4. Enter the 6-digit code below',
    enterLinkCode: 'Enter Link Code',
    openAfuChatWeb: 'Open AfuChat Web',
    enterCode: 'Please enter your link code',
    getCodeInfo: 'Get this code from AfuChat Settings → Security → Link Telegram',
    
    // Create account
    createAccountTitle: 'Create New AfuChat Account',
    createAccountDesc: 'Create a new AfuChat account directly from Telegram.',
    youNeedToProvide: 'You will need to provide',
    email: 'Email address',
    password: 'Password',
    username: 'Username',
    profilePicture: 'Profile picture (max 5MB)',
    profileComplete: 'Your profile will be complete from the start.',
    startRegistration: 'Start Registration',
    
    // Registration
    enterEmail: 'Enter your email address',
    invalidEmail: 'Invalid email format. Please enter a valid email.',
    emailExists: 'This email is already registered. Please use a different email or link your existing account.',
    tryDifferentEmail: 'Try Different Email',
    emailSet: 'Email set',
    enterPassword: 'Now enter a password (min 6 characters)',
    passwordTooShort: 'Password must be at least 6 characters. Please try again.',
    passwordSet: 'Password set',
    chooseUsername: 'Choose a unique username (letters, numbers, underscores only, 3-20 characters)',
    usernameExample: 'Example: john_doe',
    invalidUsername: 'Invalid username. Use only letters, numbers, underscores (3-20 characters).',
    usernameTaken: 'This username is already taken. Please choose a different one.',
    usernameSet: 'Username',
    enterDob: 'Enter your date of birth',
    dobFormat: 'Format: YYYY-MM-DD',
    dobExample: 'Example: 1995-06-15',
    mustBe13: 'You must be at least 13 years old to register.',
    invalidDobFormat: 'Invalid format. Use YYYY-MM-DD (e.g., 1995-06-15).',
    invalidDate: 'Invalid date. Please enter a valid date in the past.',
    dobSet: 'Date of birth',
    enterCountry: 'Enter your country',
    countryExample: 'e.g., United States, Uganda, Germany',
    countryNotFound: 'Country not found. Please enter a valid country name.',
    didYouMean: 'Did you mean "{country}"? Please enter the exact country name.',
    countrySet: 'Country',
    selectLanguage: 'Select your preferred language',
    languageSet: 'Language',
    finalStep: 'Final Step: Profile Picture',
    sendPhoto: 'Send a photo to use as your profile picture.',
    photoMaxSize: 'Maximum size: 5MB. For best results, use a square image.',
    skipForNow: 'Skip for now',
    imageTooLarge: 'Image too large. Maximum size is 5MB. Please send a smaller image.',
    creatingAccount: 'Creating your account...',
    registrationFailed: 'Registration failed',
    tryAgain: 'Try Again',
    accountCreated: 'Account Created Successfully',
    welcomeTo: 'Welcome to AfuChat, {name}',
    canAddPictureLater: 'You can add a profile picture later from your profile settings.',
    loginAt: 'You can now log in at afuchat.com with your email.',
    
    // Delete account
    deleteAccountTitle: 'Delete Account',
    deleteWarning: 'WARNING: This action is PERMANENT and cannot be undone.',
    deleteWillRemove: 'Deleting your account will remove',
    allPosts: 'All your posts and replies',
    allMessages: 'All your messages and chats',
    allFollowers: 'All your followers and following',
    allBalances: 'Your Nexa and ACoin balance',
    allGifts: 'All gifts sent and received',
    allData: 'All your data',
    confirmDelete: 'Are you absolutely sure you want to delete your account?',
    yesDelete: 'Yes, Delete My Account',
    
    // Suggested users
    suggestedUsers: 'Suggested Users to Follow',
    followUsers: 'Follow users to see their posts.',
    noSuggestions: 'No suggested users available at the moment.',
    followingUser: 'Following',
    follow: 'Follow',
    
    // Transaction history
    transactionHistory: 'Transaction History',
    noTransactions: 'No transactions yet.',
    
    // Support
    supportTitle: 'Support',
    needHelp: 'Need help? Contact us',
    emailSupport: 'Email Support',
    
    // Admin
    adminDashboard: 'Admin Dashboard',
    manageUsers: 'Manage Users',
    managePosts: 'Manage Posts',
    manageWallets: 'Manage Wallets',
    platformStats: 'Platform Stats',
    manageGifts: 'Manage Gifts',
    subscriptions: 'Subscriptions',
    reports: 'Reports',
    broadcast: 'Broadcast Message',
    
    // Misc
    linkFirst: 'Please link your account first.',
    userNotFound: 'User not found. Please check the username.',
    cannotSendToSelf: 'You cannot send to yourself.',
    insufficientBalance: 'Insufficient balance.',
    enterAmount: 'Enter the amount',
    transferSuccess: 'Transfer Successful',
    youSent: 'You sent {amount} {currency} to {name}',
    sendMore: 'Send More',
    conversionSuccess: 'Conversion Successful',
    converted: 'Converted {from} Nexa to {to} ACoin',
    fee: 'Fee',
    newBalances: 'New Balances',
    amountTooSmall: 'Conversion amount too small.',
    minAmount: 'Minimum amount is {min}.',
    howManyCanClaim: 'How many people can claim this envelope? (1-100)',
    invalidNumber: 'Please enter a number between 1 and 100.',
    envelopeCreated: 'Red Envelope Created',
    amount: 'Amount',
    canClaim: 'Can claim',
    people: 'people',
    expires: 'Expires',
    hours: 'hours',
    shareWithFriends: 'Share with friends',
    shareOnTelegram: 'Share on Telegram',
    createAnother: 'Create Another',
    giftSent: 'Gift Sent',
    youSentGift: 'You sent "{gift}" to {name}',
    giftCost: 'This gift costs {cost} Nexa.',
    playNow: 'Play Now',
    backToGames: 'Back to Games',
    noScoresYet: 'No scores yet. Play some games.',
    playGames: 'Play Games',
    allMarkedRead: 'All notifications marked as read.',
    profileUpdated: 'Profile updated.',
    invalidLinkCode: 'Invalid or expired link code.',
    accountLinkedSuccess: 'Account linked successfully.',
    openApp: 'Open App',
    backToMiniApps: 'Back to Mini Apps',
    sendingTo: 'Sending to',
    enterRecipient: 'Enter recipient username (without @)',
    
    // Languages
    english: 'English',
    spanish: 'Español',
    french: 'Français',
    arabic: 'العربية',
    swahili: 'Swahili',
  },
  es: {
    welcome: 'Bienvenido a <b>AfuChat</b>',
    welcomeBack: 'Bienvenido de nuevo, <b>{name}</b>',
    accountLinked: 'Cuenta vinculada',
    linkToAccess: 'Vincula tu cuenta para acceder a todas las funciones',
    mainMenu: 'Menú Principal',
    back: 'Atrás',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    success: 'Éxito',
    error: 'Error',
    loading: 'Cargando...',
    refresh: 'Actualizar',
    nexa: 'Nexa',
    acoin: 'ACoin',
    grade: 'Grado',
    streak: 'Racha de Inicio',
    days: 'días',
    feed: 'Feed',
    chats: 'Chats',
    wallet: 'Billetera',
    gifts: 'Regalos',
    profile: 'Perfil',
    notifications: 'Notificaciones',
    stories: 'Historias',
    games: 'Juegos',
    leaderboard: 'Clasificación',
    miniApps: 'Mini Apps',
    discoverUsers: 'Descubrir Usuarios',
    settings: 'Ajustes',
    adminPanel: 'Panel Admin',
    linkAccount: 'Vincular Cuenta',
    createAccount: 'Crear Cuenta',
    aboutAfuChat: 'Sobre AfuChat',
    latestPosts: 'Últimas Publicaciones',
    noPosts: 'Sin publicaciones aún. Sé el primero.',
    newPost: 'Nueva Publicación',
    postWithImage: 'Publicar con Imagen',
    yourWallet: 'Tu Billetera',
    nexaBalance: 'Balance de Nexa',
    acoinBalance: 'Balance de ACoin',
    currentGrade: 'Grado Actual',
    loginStreak: 'Racha de Inicio',
    earnNexa: 'Gana Nexa publicando, interactuando y con inicios diarios.',
    buyAcoinInfo: 'Compra ACoin via Telegram a $0.01 por ACoin.',
    buyAcoin: 'Comprar ACoin',
    convertNexa: 'Convertir Nexa a ACoin',
    sendNexa: 'Enviar Nexa',
    sendAcoin: 'Enviar ACoin',
    txHistory: 'Historial de Transacciones',
    redEnvelopes: 'Sobres Rojos',
    giftsTitle: 'Regalos',
    giftsDesc: 'Envía hermosos regalos a tus amigos y colecciona rarezas.',
    browseGifts: 'Ver Regalos',
    myCollection: 'Mi Colección',
    marketplace: 'Mercado',
    giftStats: 'Estadísticas',
    yourChats: 'Tus Chats',
    noChats: 'Sin conversaciones. Empieza a chatear.',
    newChat: 'Nuevo Chat',
    createGroup: 'Crear Grupo',
    createChannel: 'Crear Canal',
    yourProfile: 'Tu Perfil',
    name: 'Nombre',
    handle: 'Usuario',
    bio: 'Biografía',
    country: 'País',
    dateOfBirth: 'Fecha de Nacimiento',
    privacy: 'Privacidad',
    privateProfile: 'Privado',
    publicProfile: 'Público',
    onlineStatus: 'Estado en Línea',
    visible: 'Visible',
    hidden: 'Oculto',
    stats: 'Estadísticas',
    followers: 'Seguidores',
    following: 'Siguiendo',
    editProfile: 'Editar Perfil',
    changeAvatar: 'Cambiar Avatar',
    viewStats: 'Ver Estadísticas',
    privacySettings: 'Configuración de Privacidad',
    settingsTitle: 'Ajustes',
    manageAccount: 'Administra tu cuenta de AfuChat.',
    notificationSettings: 'Notificaciones',
    appearance: 'Apariencia',
    security: 'Seguridad',
    unlinkAccount: 'Desvincular Cuenta',
    openWebApp: 'Abrir Web',
    support: 'Soporte',
    deleteAccount: 'Eliminar Cuenta',
    selectLanguage: 'Selecciona tu idioma preferido',
    english: 'English',
    spanish: 'Español',
    french: 'Français',
    arabic: 'العربية',
    swahili: 'Swahili',
    startRegistration: 'Iniciar Registro',
    enterEmail: 'Ingresa tu correo electrónico',
    enterPassword: 'Ingresa una contraseña (mín. 6 caracteres)',
    chooseUsername: 'Elige un nombre de usuario único',
    enterDob: 'Ingresa tu fecha de nacimiento',
    enterCountry: 'Ingresa tu país',
    finalStep: 'Paso Final: Foto de Perfil',
    sendPhoto: 'Envía una foto para usar como imagen de perfil.',
    skipForNow: 'Omitir por ahora',
    creatingAccount: 'Creando tu cuenta...',
    accountCreated: 'Cuenta Creada Exitosamente',
    linkFirst: 'Primero vincula tu cuenta.',
    insufficientBalance: 'Saldo insuficiente.',
    transferSuccess: 'Transferencia Exitosa',
  },
  fr: {
    welcome: 'Bienvenue sur <b>AfuChat</b>',
    welcomeBack: 'Bon retour, <b>{name}</b>',
    accountLinked: 'Compte lié',
    linkToAccess: 'Liez votre compte pour accéder à toutes les fonctionnalités',
    mainMenu: 'Menu Principal',
    back: 'Retour',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    success: 'Succès',
    error: 'Erreur',
    loading: 'Chargement...',
    refresh: 'Actualiser',
    nexa: 'Nexa',
    acoin: 'ACoin',
    grade: 'Grade',
    streak: 'Série de connexion',
    days: 'jours',
    feed: 'Fil',
    chats: 'Messages',
    wallet: 'Portefeuille',
    gifts: 'Cadeaux',
    profile: 'Profil',
    notifications: 'Notifications',
    stories: 'Stories',
    games: 'Jeux',
    leaderboard: 'Classement',
    miniApps: 'Mini Apps',
    discoverUsers: 'Découvrir',
    settings: 'Paramètres',
    adminPanel: 'Admin',
    linkAccount: 'Lier un Compte',
    createAccount: 'Créer un Compte',
    aboutAfuChat: 'À propos',
    yourWallet: 'Votre Portefeuille',
    nexaBalance: 'Solde Nexa',
    acoinBalance: 'Solde ACoin',
    selectLanguage: 'Sélectionnez votre langue',
    english: 'English',
    spanish: 'Español',
    french: 'Français',
    arabic: 'العربية',
    swahili: 'Swahili',
    startRegistration: 'Commencer',
    enterEmail: 'Entrez votre email',
    enterPassword: 'Entrez un mot de passe (min. 6 caractères)',
    chooseUsername: 'Choisissez un nom d\'utilisateur unique',
    enterDob: 'Entrez votre date de naissance',
    enterCountry: 'Entrez votre pays',
    finalStep: 'Dernière étape: Photo de profil',
    sendPhoto: 'Envoyez une photo pour votre profil.',
    skipForNow: 'Passer',
    creatingAccount: 'Création de votre compte...',
    accountCreated: 'Compte Créé avec Succès',
    linkFirst: 'Veuillez d\'abord lier votre compte.',
    settingsTitle: 'Paramètres',
  },
  ar: {
    welcome: 'مرحباً بك في <b>AfuChat</b>',
    welcomeBack: 'مرحباً مجدداً، <b>{name}</b>',
    accountLinked: 'الحساب مرتبط',
    linkToAccess: 'اربط حسابك للوصول إلى جميع الميزات',
    mainMenu: 'القائمة الرئيسية',
    back: 'رجوع',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    success: 'نجاح',
    error: 'خطأ',
    loading: 'جاري التحميل...',
    refresh: 'تحديث',
    nexa: 'Nexa',
    acoin: 'ACoin',
    grade: 'الرتبة',
    streak: 'سلسلة تسجيل الدخول',
    days: 'أيام',
    feed: 'المنشورات',
    chats: 'المحادثات',
    wallet: 'المحفظة',
    gifts: 'الهدايا',
    profile: 'الملف الشخصي',
    notifications: 'الإشعارات',
    stories: 'القصص',
    games: 'الألعاب',
    leaderboard: 'لوحة المتصدرين',
    miniApps: 'تطبيقات مصغرة',
    discoverUsers: 'اكتشف',
    settings: 'الإعدادات',
    adminPanel: 'لوحة الإدارة',
    linkAccount: 'ربط الحساب',
    createAccount: 'إنشاء حساب',
    aboutAfuChat: 'حول AfuChat',
    selectLanguage: 'اختر لغتك المفضلة',
    english: 'English',
    spanish: 'Español',
    french: 'Français',
    arabic: 'العربية',
    swahili: 'Swahili',
    startRegistration: 'بدء التسجيل',
    enterEmail: 'أدخل بريدك الإلكتروني',
    enterPassword: 'أدخل كلمة مرور (6 أحرف على الأقل)',
    chooseUsername: 'اختر اسم مستخدم فريد',
    enterDob: 'أدخل تاريخ ميلادك',
    enterCountry: 'أدخل بلدك',
    finalStep: 'الخطوة الأخيرة: صورة الملف الشخصي',
    sendPhoto: 'أرسل صورة لملفك الشخصي.',
    skipForNow: 'تخطي الآن',
    creatingAccount: 'جاري إنشاء حسابك...',
    accountCreated: 'تم إنشاء الحساب بنجاح',
    linkFirst: 'الرجاء ربط حسابك أولاً.',
    settingsTitle: 'الإعدادات',
  },
  sw: {
    welcome: 'Karibu <b>AfuChat</b>',
    welcomeBack: 'Karibu tena, <b>{name}</b>',
    accountLinked: 'Akaunti imeunganishwa',
    linkToAccess: 'Unganisha akaunti yako kupata vipengele vyote',
    mainMenu: 'Menyu Kuu',
    back: 'Rudi',
    cancel: 'Ghairi',
    confirm: 'Thibitisha',
    success: 'Imefanikiwa',
    error: 'Hitilafu',
    loading: 'Inapakia...',
    refresh: 'Sasisha',
    nexa: 'Nexa',
    acoin: 'ACoin',
    grade: 'Daraja',
    streak: 'Mfululizo wa Kuingia',
    days: 'siku',
    feed: 'Machapisho',
    chats: 'Mazungumzo',
    wallet: 'Pochi',
    gifts: 'Zawadi',
    profile: 'Wasifu',
    notifications: 'Arifa',
    stories: 'Hadithi',
    games: 'Michezo',
    leaderboard: 'Orodha ya Viongozi',
    miniApps: 'Programu Ndogo',
    discoverUsers: 'Gundua',
    settings: 'Mipangilio',
    adminPanel: 'Paneli ya Msimamizi',
    linkAccount: 'Unganisha Akaunti',
    createAccount: 'Unda Akaunti',
    aboutAfuChat: 'Kuhusu AfuChat',
    selectLanguage: 'Chagua lugha yako',
    english: 'English',
    spanish: 'Español',
    french: 'Français',
    arabic: 'العربية',
    swahili: 'Swahili',
    startRegistration: 'Anza Usajili',
    enterEmail: 'Ingiza barua pepe yako',
    enterPassword: 'Ingiza nenosiri (angalau herufi 6)',
    chooseUsername: 'Chagua jina la mtumiaji',
    enterDob: 'Ingiza tarehe ya kuzaliwa',
    enterCountry: 'Ingiza nchi yako',
    finalStep: 'Hatua ya Mwisho: Picha ya Wasifu',
    sendPhoto: 'Tuma picha kwa wasifu wako.',
    skipForNow: 'Ruka sasa',
    creatingAccount: 'Inaunda akaunti yako...',
    accountCreated: 'Akaunti Imeundwa',
    linkFirst: 'Tafadhali unganisha akaunti yako kwanza.',
    settingsTitle: 'Mipangilio',
  }
};

function t(key: string, lang: Lang = 'en', replacements?: Record<string, string>): string {
  let text = translations[lang]?.[key] || translations.en[key] || key;
  if (replacements) {
    Object.entries(replacements).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    });
  }
  return text;
}

function getLangName(lang: Lang): string {
  const names: Record<Lang, string> = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
    ar: 'العربية',
    sw: 'Swahili'
  };
  return names[lang] || 'English';
}

// ============================================
// TELEGRAM API HELPERS
// ============================================

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
  if (replyMarkup) {
    body.reply_markup = JSON.stringify(replyMarkup);
  }
  
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}

async function editMessage(chatId: number, messageId: number, text: string, replyMarkup?: any) {
  const body: any = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
  };
  if (replyMarkup) {
    body.reply_markup = JSON.stringify(replyMarkup);
  }
  
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });
}

async function getFile(fileId: string) {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
  return response.json();
}

async function downloadFile(filePath: string): Promise<ArrayBuffer> {
  const response = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`);
  return response.arrayBuffer();
}

// ============================================
// USER MANAGEMENT
// ============================================

async function getOrCreateTelegramUser(telegramUser: any) {
  const { data: existing } = await supabase
    .from('telegram_users')
    .select('*, profiles(*)')
    .eq('telegram_id', telegramUser.id)
    .single();
  
  if (existing) return existing;
  
  const { data: newUser } = await supabase
    .from('telegram_users')
    .insert({
      telegram_id: telegramUser.id,
      telegram_username: telegramUser.username,
      telegram_first_name: telegramUser.first_name,
      telegram_last_name: telegramUser.last_name,
      preferred_language: 'en',
    })
    .select()
    .single();
  
  return newUser;
}

async function getUserLang(tgUser: any): Promise<Lang> {
  // Check telegram user's preferred language first
  if (tgUser?.preferred_language) {
    return tgUser.preferred_language as Lang;
  }
  // Fallback to profile language if linked
  if (tgUser?.profiles?.language) {
    return tgUser.profiles.language as Lang;
  }
  return 'en';
}

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();
  return !!data;
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

// ============================================
// MENU BUILDERS
// ============================================

function buildMainMenu(isLinked: boolean, profile?: any, isAdminUser = false, lang: Lang = 'en') {
  const greeting = profile 
    ? t('welcomeBack', lang, { name: profile.display_name || 'User' })
    : t('welcome', lang);
  
  let text = `${greeting}\n\n`;
  
  if (profile) {
    text += `<b>${t('nexa', lang)}:</b> ${profile.xp?.toLocaleString() || 0}\n`;
    text += `<b>${t('acoin', lang)}:</b> ${profile.acoin?.toLocaleString() || 0}\n`;
    if (profile.current_grade) {
      text += `<b>${t('grade', lang)}:</b> ${profile.current_grade}\n`;
    }
    if (profile.login_streak) {
      text += `<b>${t('streak', lang)}:</b> ${profile.login_streak} ${t('days', lang)}\n`;
    }
    text += `\n${isLinked ? t('accountLinked', lang) : t('linkToAccess', lang)}`;
  } else {
    text += t('linkToAccess', lang);
  }

  const buttons = isLinked ? [
    [{ text: t('feed', lang), callback_data: 'menu_feed' }, { text: t('chats', lang), callback_data: 'menu_chats' }],
    [{ text: t('wallet', lang), callback_data: 'menu_wallet' }, { text: t('gifts', lang), callback_data: 'menu_gifts' }],
    [{ text: t('profile', lang), callback_data: 'menu_profile' }, { text: t('notifications', lang), callback_data: 'menu_notifications' }],
    [{ text: t('stories', lang), callback_data: 'menu_stories' }, { text: t('games', lang), callback_data: 'menu_games' }],
    [{ text: t('leaderboard', lang), callback_data: 'menu_leaderboard' }, { text: t('miniApps', lang), callback_data: 'menu_mini_apps' }],
    [{ text: t('discoverUsers', lang), callback_data: 'suggested_users' }],
    [{ text: t('settings', lang), callback_data: 'menu_settings' }],
    ...(isAdminUser ? [[{ text: t('adminPanel', lang), callback_data: 'admin_menu' }]] : []),
  ] : [
    [{ text: t('linkAccount', lang), callback_data: 'link_account' }],
    [{ text: t('createAccount', lang), callback_data: 'create_account' }],
    [{ text: t('aboutAfuChat', lang), callback_data: 'about' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildLanguageMenu(lang: Lang = 'en') {
  const text = `<b>${t('selectLanguage', lang)}</b>`;
  
  const buttons = [
    [{ text: 'English', callback_data: 'set_lang_en' }, { text: 'Español', callback_data: 'set_lang_es' }],
    [{ text: 'Français', callback_data: 'set_lang_fr' }, { text: 'العربية', callback_data: 'set_lang_ar' }],
    [{ text: 'Swahili', callback_data: 'set_lang_sw' }],
    [{ text: t('back', lang), callback_data: 'menu_settings' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildFeedMenu(posts: any[], lang: Lang = 'en') {
  let text = `<b>${t('latestPosts', lang)}</b>\n\n`;
  
  if (posts.length === 0) {
    text += t('noPosts', lang);
  } else {
    posts.slice(0, 5).forEach((post, i) => {
      const author = post.profiles?.display_name || 'Unknown';
      const verified = post.profiles?.is_verified ? ' ✓' : '';
      const content = post.content.slice(0, 100) + (post.content.length > 100 ? '...' : '');
      const hasImage = post.image_url || (post.post_images && post.post_images.length > 0) ? ' [img]' : '';
      text += `<b>${i + 1}. ${author}</b>${verified}${hasImage}\n${content}\n`;
      text += `${post.likes || 0} likes · ${post.replies || 0} replies · ${post.view_count || 0} views\n\n`;
    });
  }

  const buttons = [
    [{ text: t('newPost', lang), callback_data: 'new_post' }, { text: t('postWithImage', lang), callback_data: 'new_post_image' }],
    [{ text: t('refresh', lang), callback_data: 'menu_feed' }],
    [{ text: t('mainMenu', lang), callback_data: 'main_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildWalletMenu(profile: any, lang: Lang = 'en') {
  const text = `<b>${t('yourWallet', lang)}</b>

<b>${t('nexaBalance', lang)}:</b> ${profile?.xp?.toLocaleString() || 0}
<b>${t('acoinBalance', lang)}:</b> ${profile?.acoin?.toLocaleString() || 0}

<b>${t('currentGrade', lang)}:</b> ${profile?.current_grade || 'Newcomer'}
<b>${t('loginStreak', lang)}:</b> ${profile?.login_streak || 0} ${t('days', lang)}

${t('earnNexa', lang)}
${t('buyAcoinInfo', lang)}`;

  const buttons = [
    [{ text: t('buyAcoin', lang), callback_data: 'buy_acoin' }],
    [{ text: t('convertNexa', lang), callback_data: 'convert_nexa' }],
    [{ text: t('sendNexa', lang), callback_data: 'send_nexa' }, { text: t('sendAcoin', lang), callback_data: 'send_acoin' }],
    [{ text: t('txHistory', lang), callback_data: 'tx_history' }],
    [{ text: t('redEnvelopes', lang), callback_data: 'menu_red_envelopes' }],
    [{ text: t('mainMenu', lang), callback_data: 'main_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildGiftsMenu(lang: Lang = 'en') {
  const text = `<b>${t('giftsTitle', lang)}</b>

${t('giftsDesc', lang)}`;

  const buttons = [
    [{ text: t('browseGifts', lang), callback_data: 'browse_gifts' }],
    [{ text: t('myCollection', lang), callback_data: 'my_gifts' }],
    [{ text: t('marketplace', lang), callback_data: 'gift_marketplace' }],
    [{ text: t('giftStats', lang), callback_data: 'gift_stats' }],
    [{ text: t('mainMenu', lang), callback_data: 'main_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildChatsMenu(chats: any[], lang: Lang = 'en') {
  let text = `<b>${t('yourChats', lang)}</b>\n\n`;
  
  if (chats.length === 0) {
    text += t('noChats', lang);
  } else {
    chats.slice(0, 5).forEach((chat, i) => {
      const name = chat.name || 'Private Chat';
      const type = chat.is_group ? '[group]' : chat.is_channel ? '[channel]' : '';
      text += `${i + 1}. <b>${name}</b> ${type}\n`;
    });
  }

  const buttons = [
    [{ text: t('newChat', lang), callback_data: 'new_chat' }],
    [{ text: t('createGroup', lang), callback_data: 'create_group' }, { text: t('createChannel', lang), callback_data: 'create_channel' }],
    [{ text: t('refresh', lang), callback_data: 'menu_chats' }],
    [{ text: t('mainMenu', lang), callback_data: 'main_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildProfileMenu(profile: any, followerCount = 0, followingCount = 0, lang: Lang = 'en') {
  const verified = profile?.is_verified ? ' ✓' : '';
  const privateProfile = profile?.is_private ? t('privateProfile', lang) : t('publicProfile', lang);
  const onlineStatus = profile?.show_online_status ? t('visible', lang) : t('hidden', lang);
  
  const text = `<b>${t('yourProfile', lang)}</b>

<b>${t('name', lang)}:</b> ${profile?.display_name || 'Not set'}${verified}
<b>${t('handle', lang)}:</b> @${profile?.handle || 'not_set'}
<b>${t('bio', lang)}:</b> ${profile?.bio || 'No bio yet'}
<b>${t('country', lang)}:</b> ${profile?.country || 'Not set'}
<b>${t('dateOfBirth', lang)}:</b> ${profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not set'}

<b>${t('privacy', lang)}:</b> ${privateProfile}
<b>${t('onlineStatus', lang)}:</b> ${onlineStatus}

<b>${t('stats', lang)}:</b>
• ${t('grade', lang)}: ${profile?.current_grade || 'Newcomer'}
• ${t('nexa', lang)}: ${profile?.xp?.toLocaleString() || 0}
• ${t('acoin', lang)}: ${profile?.acoin?.toLocaleString() || 0}
• ${t('followers', lang)}: ${followerCount}
• ${t('following', lang)}: ${followingCount}
• ${t('streak', lang)}: ${profile?.login_streak || 0} ${t('days', lang)}`;

  const buttons = [
    [{ text: t('editProfile', lang), callback_data: 'edit_profile' }],
    [{ text: t('changeAvatar', lang), callback_data: 'change_avatar' }],
    [{ text: t('viewStats', lang), callback_data: 'view_stats' }],
    [{ text: `${t('followers', lang)} (${followerCount})`, callback_data: 'my_followers' }, { text: `${t('following', lang)} (${followingCount})`, callback_data: 'my_following' }],
    [{ text: t('privacySettings', lang), callback_data: 'privacy_settings' }],
    [{ text: t('mainMenu', lang), callback_data: 'main_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildEditProfileMenu(profile: any, lang: Lang = 'en') {
  const text = `<b>${t('editProfileTitle', lang)}</b>

<b>${t('currentValues', lang)}:</b>
• <b>${t('name', lang)}:</b> ${profile?.display_name || 'Not set'}
• <b>${t('username', lang)}:</b> @${profile?.handle || 'not_set'}
• <b>${t('bio', lang)}:</b> ${profile?.bio || 'No bio yet'}
• <b>${t('country', lang)}:</b> ${profile?.country || 'Not set'}
• <b>${t('dateOfBirth', lang)}:</b> ${profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not set'}

${t('selectToEdit', lang)}:`;

  const buttons = [
    [{ text: t('editName', lang), callback_data: 'edit_display_name' }],
    [{ text: t('editUsername', lang), callback_data: 'edit_handle' }],
    [{ text: t('editBio', lang), callback_data: 'edit_bio' }],
    [{ text: t('editCountry', lang), callback_data: 'edit_country' }],
    [{ text: t('editDob', lang), callback_data: 'edit_dob' }],
    [{ text: t('changeAvatar', lang), callback_data: 'change_avatar' }],
    [{ text: t('back', lang), callback_data: 'menu_profile' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildPrivacySettingsMenu(profile: any, lang: Lang = 'en') {
  const isPrivate = profile?.is_private;
  const showOnline = profile?.show_online_status;
  const showBalance = profile?.show_balance;
  
  const text = `<b>${t('privacySettingsTitle', lang)}</b>

${t('controlWhoCanSee', lang)}

<b>${t('currentSettings', lang)}:</b>
• ${t('profile', lang)}: ${isPrivate ? t('privateProfile', lang) : t('publicProfile', lang)}
• ${t('onlineStatus', lang)}: ${showOnline ? t('visible', lang) : t('hidden', lang)}
• Balance: ${showBalance !== false ? t('visible', lang) : t('hidden', lang)}`;

  const buttons = [
    [{ text: isPrivate ? t('makePublic', lang) : t('makePrivate', lang), callback_data: 'toggle_private' }],
    [{ text: showOnline ? t('hideOnlineStatus', lang) : t('showOnlineStatus', lang), callback_data: 'toggle_online_status' }],
    [{ text: showBalance !== false ? t('hideBalance', lang) : t('showBalance', lang), callback_data: 'toggle_balance' }],
    [{ text: t('back', lang), callback_data: 'menu_profile' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildGamesMenu(lang: Lang = 'en') {
  const text = `<b>${t('gamesTitle', lang)}</b>

${t('gamesDesc', lang)}

<b>${t('availableGames', lang)}:</b>
• ${t('puzzleGame', lang)} - Match tiles to score
• ${t('memoryGame', lang)} - Test your memory
• ${t('trivia', lang)} - Answer questions to win
• ${t('afuArena', lang)} - Battle other players`;

  const buttons = [
    [{ text: t('puzzleGame', lang), callback_data: 'game_puzzle' }, { text: t('memoryGame', lang), callback_data: 'game_memory' }],
    [{ text: t('trivia', lang), callback_data: 'game_trivia' }, { text: t('afuArena', lang), callback_data: 'game_arena' }],
    [{ text: t('myScores', lang), callback_data: 'my_game_scores' }],
    [{ text: t('leaderboard', lang), callback_data: 'menu_leaderboard' }],
    [{ text: t('mainMenu', lang), callback_data: 'main_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildLeaderboardMenu(leaderboard: any[], userRank?: number, lang: Lang = 'en') {
  let text = `<b>${t('leaderboardTitle', lang)}</b>\n\n<b>${t('topPlayers', lang)}:</b>\n\n`;
  
  leaderboard.slice(0, 10).forEach((user, i) => {
    const rank = i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`;
    const verified = user.is_verified ? ' ✓' : '';
    text += `<b>${rank}</b> ${user.display_name}${verified}\n@${user.handle} · ${user.xp?.toLocaleString() || 0} Nexa\n\n`;
  });
  
  if (userRank) {
    text += `\n<b>${t('yourRank', lang)}:</b> #${userRank}`;
  }

  const buttons = [
    [{ text: t('refresh', lang), callback_data: 'menu_leaderboard' }],
    [{ text: t('mainMenu', lang), callback_data: 'main_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildStoriesMenu(stories: any[], lang: Lang = 'en') {
  let text = `<b>${t('storiesTitle', lang)}</b>\n\n`;
  
  if (stories.length === 0) {
    text += t('noStories', lang);
  } else {
    text += `<b>${t('recentStories', lang)}:</b>\n`;
    stories.slice(0, 10).forEach((story, i) => {
      const author = story.profiles?.display_name || 'Unknown';
      const timeAgo = getTimeAgo(story.created_at);
      text += `${i + 1}. <b>${author}</b> · ${timeAgo}\n`;
    });
  }

  const buttons = [
    [{ text: t('createStory', lang), callback_data: 'create_story' }],
    [{ text: t('textStory', lang), callback_data: 'create_text_story' }],
    [{ text: t('storyViews', lang), callback_data: 'my_story_views' }],
    [{ text: t('refresh', lang), callback_data: 'menu_stories' }],
    [{ text: t('mainMenu', lang), callback_data: 'main_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildMiniAppsMenu(lang: Lang = 'en') {
  const text = `<b>${t('miniAppsTitle', lang)}</b>

${t('accessMiniApps', lang)}`;

  const buttons = [
    [{ text: t('shop', lang), callback_data: 'app_shop' }, { text: t('travel', lang), callback_data: 'app_travel' }],
    [{ text: t('foodDelivery', lang), callback_data: 'app_food' }, { text: t('rides', lang), callback_data: 'app_rides' }],
    [{ text: t('bookings', lang), callback_data: 'app_bookings' }, { text: t('afuMail', lang), callback_data: 'app_afumail' }],
    [{ text: t('finance', lang), callback_data: 'app_finance' }, { text: t('events', lang), callback_data: 'app_events' }],
    [{ text: t('openInWeb', lang), url: 'https://afuchat.com/mini-programs' }],
    [{ text: t('mainMenu', lang), callback_data: 'main_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildRedEnvelopeMenu(profile: any, lang: Lang = 'en') {
  const text = `<b>${t('redEnvelopesTitle', lang)}</b>

${t('sendLuckyMoney', lang)}

<b>${t('yourBalance', lang)}:</b> ${profile?.xp?.toLocaleString() || 0} Nexa`;

  const buttons = [
    [{ text: t('createRedEnvelope', lang), callback_data: 'create_red_envelope' }],
    [{ text: t('myEnvelopes', lang), callback_data: 'my_red_envelopes' }],
    [{ text: t('history', lang), callback_data: 'red_envelope_history' }],
    [{ text: t('back', lang), callback_data: 'menu_wallet' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildNotificationsMenu(notifications: any[], lang: Lang = 'en') {
  let text = `<b>${t('notificationsTitle', lang)}</b>\n\n`;
  
  if (notifications.length === 0) {
    text += t('noNotifications', lang);
  } else {
    notifications.slice(0, 10).forEach((notif) => {
      const unread = !notif.is_read ? '• ' : '';
      text += `${unread}${notif.message || notif.type}\n`;
    });
  }

  const buttons = [
    [{ text: t('markAllRead', lang), callback_data: 'mark_read' }],
    [{ text: t('refresh', lang), callback_data: 'menu_notifications' }],
    [{ text: t('notifSettings', lang), callback_data: 'notif_settings' }],
    [{ text: t('mainMenu', lang), callback_data: 'main_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildSettingsMenu(lang: Lang = 'en') {
  const text = `<b>${t('settingsTitle', lang)}</b>

${t('manageAccount', lang)}`;

  const buttons = [
    [{ text: t('selectLanguage', lang), callback_data: 'language_settings' }],
    [{ text: t('notifSettings', lang), callback_data: 'notif_settings' }],
    [{ text: t('privacySettings', lang), callback_data: 'privacy_settings' }],
    [{ text: t('appearance', lang), callback_data: 'appearance_settings' }],
    [{ text: t('security', lang), callback_data: 'security_settings' }],
    [{ text: t('unlinkAccount', lang), callback_data: 'unlink_account' }],
    [{ text: t('openWebApp', lang), url: 'https://afuchat.com' }],
    [{ text: t('support', lang), callback_data: 'support' }],
    [{ text: t('deleteAccount', lang), callback_data: 'delete_account' }],
    [{ text: t('mainMenu', lang), callback_data: 'main_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildNotificationSettingsMenu(prefs: any, lang: Lang = 'en') {
  const text = `<b>${t('notificationSettings', lang)}</b>`;

  const buttons = [
    [{ text: prefs?.push_likes ? 'Likes: ON' : 'Likes: OFF', callback_data: 'toggle_notif_likes' }],
    [{ text: prefs?.push_follows ? 'Follows: ON' : 'Follows: OFF', callback_data: 'toggle_notif_follows' }],
    [{ text: prefs?.push_comments ? 'Comments: ON' : 'Comments: OFF', callback_data: 'toggle_notif_comments' }],
    [{ text: prefs?.push_messages ? 'Messages: ON' : 'Messages: OFF', callback_data: 'toggle_notif_messages' }],
    [{ text: prefs?.push_gifts ? 'Gifts: ON' : 'Gifts: OFF', callback_data: 'toggle_notif_gifts' }],
    [{ text: t('back', lang), callback_data: 'menu_settings' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildLinkAccountMenu(lang: Lang = 'en') {
  const text = `<b>${t('linkAccountTitle', lang)}</b>

<b>${t('secureVerification', lang)}</b>

${t('linkInstructions', lang)}`;

  const buttons = [
    [{ text: t('enterLinkCode', lang), callback_data: 'enter_link_code' }],
    [{ text: t('openAfuChatWeb', lang), url: 'https://afuchat.com/settings' }],
    [{ text: t('back', lang), callback_data: 'main_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildCreateAccountMenu(lang: Lang = 'en') {
  const text = `<b>${t('createAccountTitle', lang)}</b>

${t('createAccountDesc', lang)}

<b>${t('youNeedToProvide', lang)}:</b>
• ${t('email', lang)}
• ${t('password', lang)}
• ${t('username', lang)}
• ${t('dateOfBirth', lang)}
• ${t('country', lang)}
• Language
• ${t('profilePicture', lang)}

${t('profileComplete', lang)}`;

  const buttons = [
    [{ text: t('startRegistration', lang), callback_data: 'start_registration' }],
    [{ text: t('back', lang), callback_data: 'main_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildDeleteAccountMenu(lang: Lang = 'en') {
  const text = `<b>${t('deleteAccountTitle', lang)}</b>

<b>${t('deleteWarning', lang)}</b>

${t('deleteWillRemove', lang)}:
• ${t('allPosts', lang)}
• ${t('allMessages', lang)}
• ${t('allFollowers', lang)}
• ${t('allBalances', lang)}
• ${t('allGifts', lang)}
• ${t('allData', lang)}

${t('confirmDelete', lang)}`;

  const buttons = [
    [{ text: t('yesDelete', lang), callback_data: 'confirm_delete_account' }],
    [{ text: t('cancel', lang), callback_data: 'menu_settings' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildSuggestedUsersMenu(users: any[], followingIds: string[], lang: Lang = 'en') {
  let text = `<b>${t('suggestedUsers', lang)}</b>\n\n`;
  text += `${t('followUsers', lang)}\n\n`;
  
  if (users.length === 0) {
    text += t('noSuggestions', lang);
  } else {
    users.forEach((user, i) => {
      const verified = user.is_verified ? ' ✓' : '';
      const following = followingIds.includes(user.id) ? ` [${t('followingUser', lang)}]` : '';
      text += `<b>${i + 1}. ${user.display_name}</b>${verified}${following}\n@${user.handle}\n`;
      if (user.bio) text += `<i>${user.bio.slice(0, 50)}${user.bio.length > 50 ? '...' : ''}</i>\n`;
      text += '\n';
    });
  }

  const buttons = users.map(user => {
    const isFollowing = followingIds.includes(user.id);
    return [{ 
      text: isFollowing ? `✓ @${user.handle}` : `${t('follow', lang)} @${user.handle}`, 
      callback_data: `follow_${user.id}` 
    }];
  });
  
  buttons.push([{ text: t('refresh', lang), callback_data: 'suggested_users' }]);
  buttons.push([{ text: t('mainMenu', lang), callback_data: 'main_menu' }]);

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildFollowersMenu(followers: any[], page = 0, totalCount = 0, lang: Lang = 'en') {
  let text = `<b>${t('followers', lang)}</b>\n\nTotal: ${totalCount}\n\n`;
  
  if (followers.length === 0) {
    text += 'No followers yet.';
  } else {
    followers.forEach((user, i) => {
      const verified = user.is_verified ? ' ✓' : '';
      text += `${page * 5 + i + 1}. <b>${user.display_name}</b>${verified}\n@${user.handle}\n\n`;
    });
  }

  const buttons: any[] = [];
  const navButtons = [];
  if (page > 0) navButtons.push({ text: 'Previous', callback_data: `followers_page_${page - 1}` });
  if (totalCount > (page + 1) * 5) navButtons.push({ text: 'Next', callback_data: `followers_page_${page + 1}` });
  if (navButtons.length > 0) buttons.push(navButtons);
  
  buttons.push([{ text: t('back', lang), callback_data: 'menu_profile' }]);

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildFollowingMenu(following: any[], page = 0, totalCount = 0, lang: Lang = 'en') {
  let text = `<b>${t('following', lang)}</b>\n\nTotal: ${totalCount}\n\n`;
  
  if (following.length === 0) {
    text += 'Not following anyone yet.';
  } else {
    following.forEach((user, i) => {
      const verified = user.is_verified ? ' ✓' : '';
      text += `${page * 5 + i + 1}. <b>${user.display_name}</b>${verified}\n@${user.handle}\n`;
    });
  }

  const buttons: any[] = following.map(user => ([
    { text: `Unfollow @${user.handle}`, callback_data: `unfollow_${user.id}` }
  ]));
  
  const navButtons = [];
  if (page > 0) navButtons.push({ text: 'Previous', callback_data: `following_page_${page - 1}` });
  if (totalCount > (page + 1) * 5) navButtons.push({ text: 'Next', callback_data: `following_page_${page + 1}` });
  if (navButtons.length > 0) buttons.push(navButtons);
  
  buttons.push([{ text: t('back', lang), callback_data: 'menu_profile' }]);

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildBrowseGiftsMenu(gifts: any[], lang: Lang = 'en') {
  let text = `<b>${t('browseGifts', lang)}</b>\n\n`;
  
  gifts.slice(0, 8).forEach((gift) => {
    const price = Math.ceil(gift.base_xp_cost * (gift.price_multiplier || 1));
    const rarity = gift.rarity === 'legendary' ? '[legendary]' : gift.rarity === 'rare' ? '[rare]' : '';
    text += `${gift.emoji} <b>${gift.name}</b> ${rarity} · ${price} Nexa\n`;
  });

  const buttons = gifts.slice(0, 8).map(gift => ([
    { text: `${gift.emoji} ${gift.name}`, callback_data: `gift_${gift.id}` }
  ]));
  
  buttons.push([{ text: t('mainMenu', lang), callback_data: 'main_menu' }]);

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildMyGiftsMenu(gifts: any[], lang: Lang = 'en') {
  let text = `<b>${t('myCollection', lang)}</b>\n\n`;
  
  if (gifts.length === 0) {
    text += 'No gifts received yet.';
  } else {
    const grouped: Record<string, number> = {};
    gifts.forEach(g => {
      const key = g.gifts?.name || 'Unknown';
      grouped[key] = (grouped[key] || 0) + 1;
    });
    
    Object.entries(grouped).forEach(([name, count]) => {
      text += `• ${name}: x${count}\n`;
    });
  }

  const buttons = [
    [{ text: t('browseGifts', lang), callback_data: 'browse_gifts' }],
    [{ text: t('back', lang), callback_data: 'menu_gifts' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

function buildTransactionHistoryMenu(transactions: any[], lang: Lang = 'en') {
  let text = `<b>${t('transactionHistory', lang)}</b>\n\n`;
  
  if (transactions.length === 0) {
    text += t('noTransactions', lang);
  } else {
    transactions.slice(0, 10).forEach((tx) => {
      const amount = tx.amount > 0 ? `+${tx.amount}` : tx.amount;
      const date = new Date(tx.created_at).toLocaleDateString();
      text += `${tx.transaction_type}: ${amount} ACoin (${date})\n`;
    });
  }

  const buttons = [
    [{ text: t('refresh', lang), callback_data: 'tx_history' }],
    [{ text: t('back', lang), callback_data: 'menu_wallet' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

// ============================================
// ADMIN MENU BUILDERS
// ============================================

function buildAdminMenu(lang: Lang = 'en') {
  const text = `<b>${t('adminDashboard', lang)}</b>`;

  const buttons = [
    [{ text: t('manageUsers', lang), callback_data: 'admin_users' }],
    [{ text: t('managePosts', lang), callback_data: 'admin_posts' }],
    [{ text: t('manageWallets', lang), callback_data: 'admin_wallets' }],
    [{ text: t('platformStats', lang), callback_data: 'admin_stats' }],
    [{ text: t('manageGifts', lang), callback_data: 'admin_gifts' }],
    [{ text: t('subscriptions', lang), callback_data: 'admin_subscriptions' }],
    [{ text: t('reports', lang), callback_data: 'admin_reports' }],
    [{ text: t('broadcast', lang), callback_data: 'admin_broadcast' }],
    [{ text: t('mainMenu', lang), callback_data: 'main_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

async function buildAdminStatsMenu(lang: Lang = 'en') {
  const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
  const { count: messageCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });
  const { count: activeSubCount } = await supabase.from('user_subscriptions').select('*', { count: 'exact', head: true }).eq('is_active', true);
  const { count: giftTxCount } = await supabase.from('gift_transactions').select('*', { count: 'exact', head: true });
  const { count: storyCount } = await supabase.from('stories').select('*', { count: 'exact', head: true });
  const { data: totalNexa } = await supabase.from('profiles').select('xp');
  const { data: totalACoin } = await supabase.from('profiles').select('acoin');
  
  const totalNexaSum = totalNexa?.reduce((acc: number, p: any) => acc + (p.xp || 0), 0) || 0;
  const totalACoinSum = totalACoin?.reduce((acc: number, p: any) => acc + (p.acoin || 0), 0) || 0;
  
  const today = new Date().toISOString().split('T')[0];
  const { count: newUsersToday } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today);
  const { count: postsToday } = await supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', today);
  
  const text = `<b>Platform Statistics</b>

<b>Users:</b>
• Total Users: ${userCount?.toLocaleString() || 0}
• New Today: ${newUsersToday?.toLocaleString() || 0}
• Active Subscriptions: ${activeSubCount?.toLocaleString() || 0}

<b>Content:</b>
• Total Posts: ${postCount?.toLocaleString() || 0}
• Posts Today: ${postsToday?.toLocaleString() || 0}
• Total Messages: ${messageCount?.toLocaleString() || 0}
• Total Stories: ${storyCount?.toLocaleString() || 0}
• Gift Transactions: ${giftTxCount?.toLocaleString() || 0}

<b>Economy:</b>
• Total Nexa: ${totalNexaSum.toLocaleString()}
• Total ACoin: ${totalACoinSum.toLocaleString()}`;

  const buttons = [
    [{ text: t('refresh', lang), callback_data: 'admin_stats' }],
    [{ text: t('back', lang), callback_data: 'admin_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

async function buildAdminUsersMenu(page = 0, lang: Lang = 'en') {
  const pageSize = 5;
  const { data: users, count } = await supabase
    .from('profiles')
    .select('id, display_name, handle, xp, acoin, is_verified, is_business_mode, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  let text = `<b>${t('manageUsers', lang)}</b>\n\nPage ${page + 1} of ${Math.ceil((count || 0) / pageSize)}\n\n`;
  
  (users || []).forEach((u: any, i: number) => {
    const verified = u.is_verified ? ' ✓' : '';
    text += `${page * pageSize + i + 1}. <b>${u.display_name}</b>${verified}\n@${u.handle} · ${u.xp} Nexa\n\n`;
  });

  const buttons = (users || []).map((u: any) => ([
    { text: u.display_name, callback_data: `admin_user_${u.id}` }
  ]));
  
  const navButtons = [];
  if (page > 0) navButtons.push({ text: 'Previous', callback_data: `admin_users_page_${page - 1}` });
  if ((count || 0) > (page + 1) * pageSize) navButtons.push({ text: 'Next', callback_data: `admin_users_page_${page + 1}` });
  if (navButtons.length > 0) buttons.push(navButtons);
  
  buttons.push([{ text: 'Search User', callback_data: 'admin_search_user' }]);
  buttons.push([{ text: t('back', lang), callback_data: 'admin_menu' }]);

  return { text, reply_markup: { inline_keyboard: buttons } };
}

async function buildAdminUserDetailMenu(userId: string, lang: Lang = 'en') {
  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (!user) {
    return { text: 'User not found', reply_markup: { inline_keyboard: [[{ text: t('back', lang), callback_data: 'admin_users' }]] } };
  }

  const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', userId);
  const { count: followerCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId);
  
  const verified = user.is_verified ? 'Yes' : 'No';
  const banned = user.is_banned ? ' [BANNED]' : '';
  
  const text = `<b>${user.display_name}</b>${banned}

<b>Handle:</b> @${user.handle}
<b>Bio:</b> ${user.bio || 'No bio'}
<b>Country:</b> ${user.country || 'Not set'}

<b>Status:</b>
• Verified: ${verified}
• Grade: ${user.current_grade || 'Newcomer'}

<b>Economy:</b>
• Nexa: ${user.xp?.toLocaleString() || 0}
• ACoin: ${user.acoin?.toLocaleString() || 0}

<b>Stats:</b>
• Posts: ${postCount || 0}
• Followers: ${followerCount || 0}
• Login Streak: ${user.login_streak || 0} days

<b>Created:</b> ${new Date(user.created_at).toLocaleDateString()}`;

  const buttons = [
    [{ text: 'Give Nexa', callback_data: `admin_give_nexa_${userId}` }, { text: 'Give ACoin', callback_data: `admin_give_acoin_${userId}` }],
    [{ text: user.is_verified ? 'Remove Verified' : 'Verify User', callback_data: `admin_toggle_verify_${userId}` }],
    [{ text: user.is_banned ? 'Unban User' : 'Ban User', callback_data: `admin_toggle_ban_${userId}` }],
    [{ text: 'Send Message', callback_data: `admin_message_user_${userId}` }],
    [{ text: 'Delete User', callback_data: `admin_delete_user_${userId}` }],
    [{ text: t('back', lang), callback_data: 'admin_users' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

async function buildAdminPostsMenu(page = 0, lang: Lang = 'en') {
  const pageSize = 5;
  const { data: posts, count } = await supabase
    .from('posts')
    .select('id, content, author_id, created_at, profiles(display_name, handle)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  let text = `<b>${t('managePosts', lang)}</b>\n\nPage ${page + 1} of ${Math.ceil((count || 0) / pageSize)}\n\n`;
  
  (posts || []).forEach((p: any, i: number) => {
    const content = p.content.slice(0, 50) + (p.content.length > 50 ? '...' : '');
    text += `${page * pageSize + i + 1}. <b>${p.profiles?.display_name || 'Unknown'}</b>\n${content}\n\n`;
  });

  const buttons = (posts || []).map((p: any) => ([
    { text: `Post by ${p.profiles?.display_name || 'Unknown'}`, callback_data: `admin_post_${p.id}` }
  ]));
  
  const navButtons = [];
  if (page > 0) navButtons.push({ text: 'Previous', callback_data: `admin_posts_page_${page - 1}` });
  if ((count || 0) > (page + 1) * pageSize) navButtons.push({ text: 'Next', callback_data: `admin_posts_page_${page + 1}` });
  if (navButtons.length > 0) buttons.push(navButtons);
  
  buttons.push([{ text: t('back', lang), callback_data: 'admin_menu' }]);

  return { text, reply_markup: { inline_keyboard: buttons } };
}

async function buildAdminPostDetailMenu(postId: string, lang: Lang = 'en') {
  const { data: post } = await supabase
    .from('posts')
    .select('*, profiles(display_name, handle)')
    .eq('id', postId)
    .single();
  
  if (!post) {
    return { text: 'Post not found', reply_markup: { inline_keyboard: [[{ text: t('back', lang), callback_data: 'admin_posts' }]] } };
  }

  const text = `<b>Post by ${post.profiles?.display_name}</b>
@${post.profiles?.handle}

${post.content}

<b>Stats:</b>
• Likes: ${post.likes || 0}
• Replies: ${post.replies || 0}
• Views: ${post.view_count || 0}

<b>Created:</b> ${new Date(post.created_at).toLocaleString()}`;

  const buttons = [
    [{ text: 'Delete Post', callback_data: `admin_delete_post_${postId}` }],
    [{ text: t('back', lang), callback_data: 'admin_posts' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

async function buildAdminWalletsMenu(lang: Lang = 'en') {
  const { data: totalNexa } = await supabase.from('profiles').select('xp');
  const { data: totalACoin } = await supabase.from('profiles').select('acoin');
  
  const totalNexaSum = totalNexa?.reduce((acc: number, p: any) => acc + (p.xp || 0), 0) || 0;
  const totalACoinSum = totalACoin?.reduce((acc: number, p: any) => acc + (p.acoin || 0), 0) || 0;
  
  const { data: topNexa } = await supabase.from('profiles').select('display_name, xp').order('xp', { ascending: false }).limit(5);
  const { data: topACoin } = await supabase.from('profiles').select('display_name, acoin').order('acoin', { ascending: false }).limit(5);
  
  let text = `<b>${t('manageWallets', lang)}</b>

<b>Total in Circulation:</b>
• Nexa: ${totalNexaSum.toLocaleString()}
• ACoin: ${totalACoinSum.toLocaleString()}

<b>Top Nexa Holders:</b>\n`;
  
  topNexa?.forEach((u: any, i: number) => {
    text += `${i + 1}. ${u.display_name}: ${u.xp?.toLocaleString() || 0}\n`;
  });
  
  text += `\n<b>Top ACoin Holders:</b>\n`;
  topACoin?.forEach((u: any, i: number) => {
    text += `${i + 1}. ${u.display_name}: ${u.acoin?.toLocaleString() || 0}\n`;
  });

  const buttons = [
    [{ text: t('refresh', lang), callback_data: 'admin_wallets' }],
    [{ text: t('back', lang), callback_data: 'admin_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

async function buildAdminGiftsMenu(lang: Lang = 'en') {
  const { data: gifts } = await supabase.from('gifts').select('*, gift_statistics(total_sent, price_multiplier)').order('base_xp_cost', { ascending: true }).limit(10);
  
  let text = `<b>${t('manageGifts', lang)}</b>\n\n`;
  
  gifts?.forEach((g: any) => {
    const multiplier = g.gift_statistics?.price_multiplier || 1;
    const sent = g.gift_statistics?.total_sent || 0;
    text += `${g.emoji} <b>${g.name}</b>\nBase: ${g.base_xp_cost} · Multiplier: ${multiplier.toFixed(2)}x · Sent: ${sent}\n\n`;
  });

  const buttons = [
    [{ text: t('refresh', lang), callback_data: 'admin_gifts' }],
    [{ text: t('back', lang), callback_data: 'admin_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

async function buildAdminSubscriptionsMenu(lang: Lang = 'en') {
  const { count: activeCount } = await supabase.from('user_subscriptions').select('*', { count: 'exact', head: true }).eq('is_active', true);
  const { data: recentSubs } = await supabase.from('user_subscriptions').select('*, profiles(display_name)').order('created_at', { ascending: false }).limit(5);
  
  let text = `<b>${t('subscriptions', lang)}</b>

<b>Active Subscriptions:</b> ${activeCount || 0}

<b>Recent Subscriptions:</b>\n`;
  
  recentSubs?.forEach((s: any) => {
    text += `• ${s.profiles?.display_name || 'Unknown'} (${s.plan_type})\n`;
  });

  const buttons = [
    [{ text: t('refresh', lang), callback_data: 'admin_subscriptions' }],
    [{ text: t('back', lang), callback_data: 'admin_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

async function buildAdminReportsMenu(lang: Lang = 'en') {
  const { data: reports, count } = await supabase.from('reports').select('*, profiles:reporter_id(display_name)', { count: 'exact' }).eq('status', 'pending').order('created_at', { ascending: false }).limit(5);
  
  let text = `<b>${t('reports', lang)}</b>

<b>Pending Reports:</b> ${count || 0}\n\n`;
  
  if (reports && reports.length > 0) {
    reports.forEach((r: any, i: number) => {
      text += `${i + 1}. ${r.report_type} by ${r.profiles?.display_name || 'Unknown'}\n${r.reason?.slice(0, 50) || 'No reason'}...\n\n`;
    });
  } else {
    text += 'No pending reports.';
  }

  const buttons = [
    [{ text: t('refresh', lang), callback_data: 'admin_reports' }],
    [{ text: t('back', lang), callback_data: 'admin_menu' }],
  ];

  return { text, reply_markup: { inline_keyboard: buttons } };
}

// ============================================
// COUNTRIES LIST
// ============================================

const VALID_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain",
  "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
  "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark",
  "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt",
  "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Fiji",
  "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece",
  "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras",
  "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya",
  "Kiribati", "North Korea", "South Korea", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos",
  "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali",
  "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
  "Nigeria", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
  "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan",
  "Spain", "Sri Lanka", "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda",
  "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia",
  "Zimbabwe"
];

// ============================================
// CALLBACK HANDLER
// ============================================

async function handleCallback(callbackQuery: any) {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramUser = callbackQuery.from;
  
  await answerCallbackQuery(callbackQuery.id);
  
  const tgUser = await getOrCreateTelegramUser(telegramUser);
  const isLinked = tgUser?.is_linked && tgUser?.user_id;
  const lang = await getUserLang(tgUser);
  
  let isAdminUser = false;
  if (isLinked && tgUser.user_id) {
    isAdminUser = await isAdmin(tgUser.user_id);
  }
  
  // Language selection
  if (data.startsWith('set_lang_')) {
    const newLang = data.replace('set_lang_', '') as Lang;
    await supabase.from('telegram_users').update({ preferred_language: newLang }).eq('telegram_id', telegramUser.id);
    
    if (isLinked && tgUser.user_id) {
      await supabase.from('profiles').update({ language: newLang }).eq('id', tgUser.user_id);
    }
    
    const menu = buildSettingsMenu(newLang);
    await editMessage(chatId, messageId, `${t('success', newLang)}: ${getLangName(newLang)}\n\n` + menu.text, menu.reply_markup);
    return;
  }
  
  // Registration language selection
  if (data.startsWith('reg_lang_')) {
    const newLang = data.replace('reg_lang_', '') as Lang;
    await handleRegistrationLanguage(chatId, messageId, telegramUser, tgUser, newLang);
    return;
  }
  
  if (data === 'reg_skip_avatar') {
    await completeRegistrationWithoutAvatar(chatId, messageId, telegramUser, tgUser);
    return;
  }
  
  switch (data) {
    case 'main_menu': {
      let profile = null;
      if (isLinked && tgUser.user_id) {
        const { data } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
        profile = data;
      }
      const menu = buildMainMenu(isLinked, profile, isAdminUser, lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'language_settings': {
      const menu = buildLanguageMenu(lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'menu_feed': {
      if (!isLinked) {
        await editMessage(chatId, messageId, t('linkFirst', lang), {
          inline_keyboard: [[{ text: t('linkAccount', lang), callback_data: 'link_account' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
        });
        return;
      }
      
      const { data: posts } = await supabase
        .from('posts')
        .select('*, profiles(display_name, is_verified), post_images(image_url)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      const menu = buildFeedMenu(posts || [], lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'new_post': {
      if (!isLinked) return;
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_post' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('newPost', lang)}</b>\n\nEnter your post content:`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_feed' }]]
      });
      break;
    }
    
    case 'new_post_image': {
      if (!isLinked) return;
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_post_image' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('postWithImage', lang)}</b>\n\nSend a photo with optional caption:`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_feed' }]]
      });
      break;
    }
    
    case 'menu_wallet': {
      if (!isLinked) {
        await editMessage(chatId, messageId, t('linkFirst', lang), {
          inline_keyboard: [[{ text: t('linkAccount', lang), callback_data: 'link_account' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
        });
        return;
      }
      
      const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
      const menu = buildWalletMenu(freshProfile, lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'menu_gifts': {
      const menu = buildGiftsMenu(lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'browse_gifts': {
      const { data: gifts } = await supabase
        .from('gifts')
        .select('*, gift_statistics(price_multiplier)')
        .order('base_xp_cost', { ascending: true })
        .limit(8);
      
      const menu = buildBrowseGiftsMenu(gifts || [], lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'my_gifts': {
      if (!isLinked) return;
      
      const { data: receivedGifts } = await supabase
        .from('gift_transactions')
        .select('*, gifts(name, emoji)')
        .eq('receiver_id', tgUser.user_id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      const menu = buildMyGiftsMenu(receivedGifts || [], lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'menu_chats': {
      if (!isLinked) {
        await editMessage(chatId, messageId, t('linkFirst', lang), {
          inline_keyboard: [[{ text: t('linkAccount', lang), callback_data: 'link_account' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
        });
        return;
      }
      
      const { data: chatMembers } = await supabase
        .from('chat_members')
        .select('chat_id, chats(name, is_group, is_channel)')
        .eq('user_id', tgUser.user_id)
        .limit(5);
      
      const chats = (chatMembers || []).map((cm: any) => ({
        name: cm.chats?.name,
        is_group: cm.chats?.is_group,
        is_channel: cm.chats?.is_channel
      }));
      
      const menu = buildChatsMenu(chats, lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'menu_profile': {
      if (!isLinked) {
        await editMessage(chatId, messageId, t('linkFirst', lang), {
          inline_keyboard: [[{ text: t('linkAccount', lang), callback_data: 'link_account' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
        });
        return;
      }
      
      const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
      const { count: followerCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', tgUser.user_id);
      const { count: followingCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', tgUser.user_id);
      
      const menu = buildProfileMenu(freshProfile, followerCount || 0, followingCount || 0, lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'edit_profile': {
      if (!isLinked) return;
      
      const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
      const menu = buildEditProfileMenu(freshProfile, lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'edit_display_name': {
      if (!isLinked) return;
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_display_name' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('editName', lang)}</b>\n\nEnter your new display name:`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'edit_profile' }]]
      });
      break;
    }
    
    case 'edit_handle': {
      if (!isLinked) return;
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_handle' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('editUsername', lang)}</b>\n\nEnter your new username (letters, numbers, underscores only):`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'edit_profile' }]]
      });
      break;
    }
    
    case 'edit_bio': {
      if (!isLinked) return;
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_bio' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('editBio', lang)}</b>\n\nEnter your new bio (max 160 characters):`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'edit_profile' }]]
      });
      break;
    }
    
    case 'edit_country': {
      if (!isLinked) return;
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_country' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('editCountry', lang)}</b>\n\nEnter your country name (e.g., United States, Uganda):`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'edit_profile' }]]
      });
      break;
    }
    
    case 'edit_dob': {
      if (!isLinked) return;
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_dob' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('editDob', lang)}</b>\n\nEnter your date of birth (format: YYYY-MM-DD):`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'edit_profile' }]]
      });
      break;
    }
    
    case 'change_avatar': {
      if (!isLinked) return;
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_avatar' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('changeAvatar', lang)}</b>\n\nSend a photo to use as your new profile picture.`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'edit_profile' }]]
      });
      break;
    }
    
    case 'privacy_settings': {
      if (!isLinked) return;
      
      const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
      const menu = buildPrivacySettingsMenu(freshProfile, lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'toggle_private': {
      if (!isLinked) return;
      
      const { data: currentProfile } = await supabase.from('profiles').select('is_private').eq('id', tgUser.user_id).single();
      await supabase.from('profiles').update({ is_private: !currentProfile?.is_private }).eq('id', tgUser.user_id);
      
      const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
      const menu = buildPrivacySettingsMenu(freshProfile, lang);
      await editMessage(chatId, messageId, `${t('success', lang)}!\n\n` + menu.text, menu.reply_markup);
      break;
    }
    
    case 'toggle_online_status': {
      if (!isLinked) return;
      
      const { data: currentProfile } = await supabase.from('profiles').select('show_online_status').eq('id', tgUser.user_id).single();
      await supabase.from('profiles').update({ show_online_status: !currentProfile?.show_online_status }).eq('id', tgUser.user_id);
      
      const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
      const menu = buildPrivacySettingsMenu(freshProfile, lang);
      await editMessage(chatId, messageId, `${t('success', lang)}!\n\n` + menu.text, menu.reply_markup);
      break;
    }
    
    case 'toggle_balance': {
      if (!isLinked) return;
      
      const { data: currentProfile } = await supabase.from('profiles').select('show_balance').eq('id', tgUser.user_id).single();
      await supabase.from('profiles').update({ show_balance: currentProfile?.show_balance === false ? true : false }).eq('id', tgUser.user_id);
      
      const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
      const menu = buildPrivacySettingsMenu(freshProfile, lang);
      await editMessage(chatId, messageId, `${t('success', lang)}!\n\n` + menu.text, menu.reply_markup);
      break;
    }
    
    case 'menu_games': {
      const menu = buildGamesMenu(lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'game_puzzle':
    case 'game_memory':
    case 'game_trivia':
    case 'game_arena': {
      const gameName = data.replace('game_', '');
      await editMessage(chatId, messageId, `<b>${gameName.charAt(0).toUpperCase() + gameName.slice(1)}</b>\n\nOpen the game in the AfuChat web app to play.`, {
        inline_keyboard: [
          [{ text: t('playNow', lang), url: `https://afuchat.com/games/${gameName}` }],
          [{ text: t('backToGames', lang), callback_data: 'menu_games' }]
        ]
      });
      break;
    }
    
    case 'my_game_scores': {
      if (!isLinked) return;
      
      const { data: scores } = await supabase
        .from('game_scores')
        .select('game_type, score, difficulty, created_at')
        .eq('user_id', tgUser.user_id)
        .order('score', { ascending: false })
        .limit(10);
      
      let text = `<b>${t('myScores', lang)}</b>\n\n`;
      
      if ((scores?.length || 0) === 0) {
        text += t('noScoresYet', lang);
      } else {
        scores?.forEach((s, i) => {
          text += `${i + 1}. <b>${s.game_type}</b> (${s.difficulty})\nScore: ${s.score} · ${new Date(s.created_at).toLocaleDateString()}\n\n`;
        });
      }
      
      await editMessage(chatId, messageId, text, {
        inline_keyboard: [
          [{ text: t('playGames', lang), callback_data: 'menu_games' }],
          [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]
        ]
      });
      break;
    }
    
    case 'menu_leaderboard': {
      const { data: leaderboard } = await supabase
        .from('profiles')
        .select('id, display_name, handle, xp, is_verified')
        .order('xp', { ascending: false })
        .limit(10);
      
      let userRank = undefined;
      if (isLinked && tgUser.user_id) {
        const { data: userProfile } = await supabase.from('profiles').select('xp').eq('id', tgUser.user_id).single();
        if (userProfile) {
          const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('xp', userProfile.xp);
          userRank = (count || 0) + 1;
        }
      }
      
      const menu = buildLeaderboardMenu(leaderboard || [], userRank, lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'menu_stories': {
      if (!isLinked) {
        await editMessage(chatId, messageId, t('linkFirst', lang), {
          inline_keyboard: [[{ text: t('linkAccount', lang), callback_data: 'link_account' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
        });
        return;
      }
      
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', tgUser.user_id);
      
      const followingIds = (following || []).map((f: any) => f.following_id);
      followingIds.push(tgUser.user_id);
      
      const { data: stories } = await supabase
        .from('stories')
        .select('*, profiles(display_name)')
        .in('user_id', followingIds)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      
      const menu = buildStoriesMenu(stories || [], lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'create_story': {
      if (!isLinked) return;
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_story_image' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('createStory', lang)}</b>\n\nSend a photo to create a story.\n\n<i>Stories expire after 24 hours.</i>`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_stories' }]]
      });
      break;
    }
    
    case 'create_text_story': {
      if (!isLinked) return;
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_story_text' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('textStory', lang)}</b>\n\nEnter the text for your story:`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_stories' }]]
      });
      break;
    }
    
    case 'menu_mini_apps': {
      const menu = buildMiniAppsMenu(lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'app_shop':
    case 'app_travel':
    case 'app_food':
    case 'app_rides':
    case 'app_bookings':
    case 'app_afumail':
    case 'app_finance':
    case 'app_events': {
      const appName = data.replace('app_', '');
      const appUrls: Record<string, string> = {
        shop: 'shop',
        travel: 'travel',
        food: 'food-delivery',
        rides: 'rides',
        bookings: 'bookings',
        afumail: 'afumail',
        finance: 'finance',
        events: 'events'
      };
      
      await editMessage(chatId, messageId, `<b>${appName.charAt(0).toUpperCase() + appName.slice(1)}</b>\n\nOpen in the AfuChat web app for the full experience.`, {
        inline_keyboard: [
          [{ text: t('openApp', lang), url: `https://afuchat.com/${appUrls[appName]}` }],
          [{ text: t('backToMiniApps', lang), callback_data: 'menu_mini_apps' }]
        ]
      });
      break;
    }
    
    case 'menu_red_envelopes': {
      if (!isLinked) return;
      
      const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
      const menu = buildRedEnvelopeMenu(freshProfile, lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'create_red_envelope': {
      if (!isLinked) return;
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_red_envelope_amount' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('createRedEnvelope', lang)}</b>\n\nEnter the total Nexa amount:`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_red_envelopes' }]]
      });
      break;
    }
    
    case 'menu_notifications': {
      if (!isLinked) {
        await editMessage(chatId, messageId, t('linkFirst', lang), {
          inline_keyboard: [[{ text: t('linkAccount', lang), callback_data: 'link_account' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
        });
        return;
      }
      
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', tgUser.user_id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      const menu = buildNotificationsMenu(notifications || [], lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'mark_read': {
      if (isLinked) {
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', tgUser.user_id);
      }
      await editMessage(chatId, messageId, t('allMarkedRead', lang), {
        inline_keyboard: [[{ text: t('notifications', lang), callback_data: 'menu_notifications' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
      });
      break;
    }
    
    case 'menu_settings': {
      const menu = buildSettingsMenu(lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'notif_settings': {
      if (!isLinked) return;
      
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', tgUser.user_id)
        .single();
      
      const menu = buildNotificationSettingsMenu(prefs || {
        push_likes: true,
        push_follows: true,
        push_comments: true,
        push_messages: true,
        push_gifts: true
      }, lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'toggle_notif_likes':
    case 'toggle_notif_follows':
    case 'toggle_notif_comments':
    case 'toggle_notif_messages':
    case 'toggle_notif_gifts': {
      if (!isLinked) return;
      
      const field = data.replace('toggle_notif_', 'push_');
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', tgUser.user_id)
        .single();
      
      const currentValue = prefs?.[field] !== false;
      
      await supabase
        .from('notification_preferences')
        .upsert({
          user_id: tgUser.user_id,
          [field]: !currentValue
        }, { onConflict: 'user_id' });
      
      const { data: updatedPrefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', tgUser.user_id)
        .single();
      
      const menu = buildNotificationSettingsMenu(updatedPrefs, lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'support': {
      await editMessage(chatId, messageId, `<b>${t('supportTitle', lang)}</b>

${t('needHelp', lang)}:

Email: support@afuchat.com
Web: afuchat.com/support`, {
        inline_keyboard: [
          [{ text: t('emailSupport', lang), url: 'mailto:support@afuchat.com' }],
          [{ text: t('back', lang), callback_data: 'menu_settings' }]
        ]
      });
      break;
    }
    
    case 'link_account': {
      const menu = buildLinkAccountMenu(lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'create_account': {
      const menu = buildCreateAccountMenu(lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'enter_link_code': {
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_link_code' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('enterLinkCode', lang)}</b>\n\n${t('getCodeInfo', lang)}`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'link_account' }]]
      });
      break;
    }
    
    case 'start_registration': {
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_reg_email', menu_data: {} }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('createAccountTitle', lang)}</b>\n\n<b>Step 1/7</b>\n\n${t('enterEmail', lang)}:`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'main_menu' }]]
      });
      break;
    }
    
    case 'delete_account': {
      const menu = buildDeleteAccountMenu(lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'confirm_delete_account': {
      if (isLinked && tgUser.user_id) {
        await supabase.from('posts').delete().eq('author_id', tgUser.user_id);
        await supabase.from('follows').delete().eq('follower_id', tgUser.user_id);
        await supabase.from('follows').delete().eq('following_id', tgUser.user_id);
        await supabase.from('notifications').delete().eq('user_id', tgUser.user_id);
        await supabase.from('telegram_users').delete().eq('user_id', tgUser.user_id);
        await supabase.from('profiles').delete().eq('id', tgUser.user_id);
        
        await editMessage(chatId, messageId, `<b>${t('success', lang)}</b>\n\nYour account has been deleted.`, {
          inline_keyboard: [[{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
        });
      }
      break;
    }
    
    case 'unlink_account': {
      await supabase.from('telegram_users').update({ is_linked: false, user_id: null }).eq('telegram_id', telegramUser.id);
      const menu = buildMainMenu(false, null, false, lang);
      await editMessage(chatId, messageId, `<b>${t('success', lang)}</b>\n\nAccount unlinked.\n\n` + menu.text, menu.reply_markup);
      break;
    }
    
    case 'suggested_users': {
      if (!isLinked) {
        await editMessage(chatId, messageId, t('linkFirst', lang), {
          inline_keyboard: [[{ text: t('linkAccount', lang), callback_data: 'link_account' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
        });
        return;
      }
      
      const { data: suggestedUsers } = await supabase
        .from('profiles')
        .select('id, display_name, handle, bio, avatar_url, is_verified, is_business_mode')
        .neq('id', tgUser.user_id)
        .order('xp', { ascending: false })
        .limit(5);
      
      const { data: following } = await supabase.from('follows').select('following_id').eq('follower_id', tgUser.user_id);
      const followingIds = (following || []).map((f: any) => f.following_id);
      
      const menu = buildSuggestedUsersMenu(suggestedUsers || [], followingIds, lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'my_followers': {
      if (!isLinked) return;
      
      const { data: followers, count } = await supabase
        .from('follows')
        .select('follower_id, profiles!follows_follower_id_fkey(id, display_name, handle, is_verified)', { count: 'exact' })
        .eq('following_id', tgUser.user_id)
        .order('created_at', { ascending: false })
        .range(0, 4);
      
      const followerProfiles = (followers || []).map((f: any) => f.profiles).filter(Boolean);
      const menu = buildFollowersMenu(followerProfiles, 0, count || 0, lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'my_following': {
      if (!isLinked) return;
      
      const { data: following, count } = await supabase
        .from('follows')
        .select('following_id, profiles!follows_following_id_fkey(id, display_name, handle, is_verified)', { count: 'exact' })
        .eq('follower_id', tgUser.user_id)
        .order('created_at', { ascending: false })
        .range(0, 4);
      
      const followingProfiles = (following || []).map((f: any) => f.profiles).filter(Boolean);
      const menu = buildFollowingMenu(followingProfiles, 0, count || 0, lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'buy_acoin': {
      const text = `<b>${t('buyAcoin', lang)}</b>

Select a package:

• 100 ACoin = $1.00
• 500 ACoin = $5.00
• 1,000 ACoin = $10.00
• 5,000 ACoin = $50.00
• 10,000 ACoin = $100.00`;

      const buttons = [
        [{ text: '100 ACoin · $1', callback_data: 'buy_acoin_100' }, { text: '500 ACoin · $5', callback_data: 'buy_acoin_500' }],
        [{ text: '1,000 ACoin · $10', callback_data: 'buy_acoin_1000' }, { text: '5,000 ACoin · $50', callback_data: 'buy_acoin_5000' }],
        [{ text: '10,000 ACoin · $100', callback_data: 'buy_acoin_10000' }],
        [{ text: t('back', lang), callback_data: 'menu_wallet' }]
      ];

      await editMessage(chatId, messageId, text, { inline_keyboard: buttons });
      break;
    }
    
    case 'convert_nexa': {
      if (!isLinked) return;
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_convert_amount' }).eq('telegram_id', telegramUser.id);
      
      const { data: settings } = await supabase.from('currency_settings').select('nexa_to_acoin_rate, conversion_fee_percent').limit(1).single();
      const rate = settings?.nexa_to_acoin_rate || 100;
      const fee = settings?.conversion_fee_percent || 5.99;
      
      await editMessage(chatId, messageId, `<b>${t('convertNexa', lang)}</b>

Rate: ${rate} Nexa = 1 ACoin
Fee: ${fee}%

Enter the amount of Nexa to convert:`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_wallet' }]]
      });
      break;
    }
    
    case 'send_nexa': {
      if (!isLinked) return;
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_nexa_recipient' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('sendNexa', lang)}</b>\n\n${t('enterRecipient', lang)}:`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_wallet' }]]
      });
      break;
    }
    
    case 'send_acoin': {
      if (!isLinked) return;
      await supabase.from('telegram_users').update({ current_menu: 'awaiting_acoin_recipient' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('sendAcoin', lang)}</b>\n\n${t('enterRecipient', lang)}:`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_wallet' }]]
      });
      break;
    }
    
    case 'tx_history': {
      if (!isLinked) return;
      
      const { data: transactions } = await supabase
        .from('acoin_transactions')
        .select('*')
        .eq('user_id', tgUser.user_id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      const menu = buildTransactionHistoryMenu(transactions || [], lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'about': {
      await editMessage(chatId, messageId, `<b>About AfuChat</b>

AfuChat is a social platform that connects you with friends, lets you share moments, and earn rewards.

<b>Features:</b>
• Social feed with posts and stories
• Real-time messaging
• Virtual currency (Nexa & ACoin)
• Gift marketplace
• Mini apps and games
• Red envelopes

Visit: afuchat.com`, {
        inline_keyboard: [
          [{ text: t('openWebApp', lang), url: 'https://afuchat.com' }],
          [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]
        ]
      });
      break;
    }
    
    // Admin menus
    case 'admin_menu': {
      if (!isAdminUser) return;
      const menu = buildAdminMenu(lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'admin_stats': {
      if (!isAdminUser) return;
      const menu = await buildAdminStatsMenu(lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'admin_users': {
      if (!isAdminUser) return;
      const menu = await buildAdminUsersMenu(0, lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'admin_posts': {
      if (!isAdminUser) return;
      const menu = await buildAdminPostsMenu(0, lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'admin_wallets': {
      if (!isAdminUser) return;
      const menu = await buildAdminWalletsMenu(lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'admin_subscriptions': {
      if (!isAdminUser) return;
      const menu = await buildAdminSubscriptionsMenu(lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'admin_reports': {
      if (!isAdminUser) return;
      const menu = await buildAdminReportsMenu(lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'admin_gifts': {
      if (!isAdminUser) return;
      const menu = await buildAdminGiftsMenu(lang);
      await editMessage(chatId, messageId, menu.text, menu.reply_markup);
      break;
    }
    
    case 'admin_search_user': {
      if (!isAdminUser) return;
      await supabase.from('telegram_users').update({ current_menu: 'admin_awaiting_user_search' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, 'Enter username or display name to search:', {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'admin_users' }]]
      });
      break;
    }
    
    case 'admin_broadcast': {
      if (!isAdminUser) return;
      await supabase.from('telegram_users').update({ current_menu: 'admin_awaiting_broadcast' }).eq('telegram_id', telegramUser.id);
      await editMessage(chatId, messageId, `<b>${t('broadcast', lang)}</b>\n\nEnter the message to send to all users:`, {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'admin_menu' }]]
      });
      break;
    }
    
    default: {
      await handleDynamicCallback(callbackQuery, data, chatId, messageId, telegramUser, tgUser, isLinked, isAdminUser, lang);
    }
  }
}

async function handleDynamicCallback(
  callbackQuery: any, 
  data: string, 
  chatId: number, 
  messageId: number, 
  telegramUser: any, 
  tgUser: any, 
  isLinked: boolean,
  isAdminUser: boolean,
  lang: Lang
) {
  // Admin pagination
  if (data.startsWith('admin_users_page_')) {
    if (!isAdminUser) return;
    const page = parseInt(data.replace('admin_users_page_', ''));
    const menu = await buildAdminUsersMenu(page, lang);
    await editMessage(chatId, messageId, menu.text, menu.reply_markup);
    return;
  }
  
  if (data.startsWith('admin_posts_page_')) {
    if (!isAdminUser) return;
    const page = parseInt(data.replace('admin_posts_page_', ''));
    const menu = await buildAdminPostsMenu(page, lang);
    await editMessage(chatId, messageId, menu.text, menu.reply_markup);
    return;
  }
  
  if (data.startsWith('admin_user_')) {
    if (!isAdminUser) return;
    const userId = data.replace('admin_user_', '');
    const menu = await buildAdminUserDetailMenu(userId, lang);
    await editMessage(chatId, messageId, menu.text, menu.reply_markup);
    return;
  }
  
  if (data.startsWith('admin_post_')) {
    if (!isAdminUser) return;
    const postId = data.replace('admin_post_', '');
    const menu = await buildAdminPostDetailMenu(postId, lang);
    await editMessage(chatId, messageId, menu.text, menu.reply_markup);
    return;
  }
  
  if (data.startsWith('admin_give_nexa_')) {
    if (!isAdminUser) return;
    const targetUserId = data.replace('admin_give_nexa_', '');
    await supabase.from('telegram_users').update({ current_menu: 'admin_awaiting_nexa_amount', menu_data: { target_user_id: targetUserId } }).eq('telegram_id', telegramUser.id);
    await editMessage(chatId, messageId, 'Enter the amount of Nexa to give:', {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: `admin_user_${targetUserId}` }]]
    });
    return;
  }
  
  if (data.startsWith('admin_give_acoin_')) {
    if (!isAdminUser) return;
    const targetUserId = data.replace('admin_give_acoin_', '');
    await supabase.from('telegram_users').update({ current_menu: 'admin_awaiting_acoin_amount', menu_data: { target_user_id: targetUserId } }).eq('telegram_id', telegramUser.id);
    await editMessage(chatId, messageId, 'Enter the amount of ACoin to give:', {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: `admin_user_${targetUserId}` }]]
    });
    return;
  }
  
  if (data.startsWith('admin_toggle_verify_')) {
    if (!isAdminUser) return;
    const targetUserId = data.replace('admin_toggle_verify_', '');
    const { data: user } = await supabase.from('profiles').select('is_verified').eq('id', targetUserId).single();
    await supabase.from('profiles').update({ is_verified: !user?.is_verified }).eq('id', targetUserId);
    const menu = await buildAdminUserDetailMenu(targetUserId, lang);
    await editMessage(chatId, messageId, `${t('success', lang)}!\n\n` + menu.text, menu.reply_markup);
    return;
  }
  
  if (data.startsWith('admin_toggle_ban_')) {
    if (!isAdminUser) return;
    const targetUserId = data.replace('admin_toggle_ban_', '');
    const { data: user } = await supabase.from('profiles').select('is_banned').eq('id', targetUserId).single();
    await supabase.from('profiles').update({ is_banned: !user?.is_banned }).eq('id', targetUserId);
    const menu = await buildAdminUserDetailMenu(targetUserId, lang);
    await editMessage(chatId, messageId, `${t('success', lang)}!\n\n` + menu.text, menu.reply_markup);
    return;
  }
  
  if (data.startsWith('admin_delete_user_')) {
    if (!isAdminUser) return;
    const targetUserId = data.replace('admin_delete_user_', '');
    await editMessage(chatId, messageId, '<b>Warning</b>\n\nAre you sure you want to DELETE this user? This cannot be undone.', {
      inline_keyboard: [
        [{ text: 'Yes, Delete User', callback_data: `admin_confirm_delete_user_${targetUserId}` }],
        [{ text: t('cancel', lang), callback_data: `admin_user_${targetUserId}` }]
      ]
    });
    return;
  }
  
  if (data.startsWith('admin_confirm_delete_user_')) {
    if (!isAdminUser) return;
    const targetUserId = data.replace('admin_confirm_delete_user_', '');
    await supabase.from('posts').delete().eq('author_id', targetUserId);
    await supabase.from('follows').delete().eq('follower_id', targetUserId);
    await supabase.from('follows').delete().eq('following_id', targetUserId);
    await supabase.from('notifications').delete().eq('user_id', targetUserId);
    await supabase.from('telegram_users').delete().eq('user_id', targetUserId);
    await supabase.from('profiles').delete().eq('id', targetUserId);
    
    const menu = await buildAdminUsersMenu(0, lang);
    await editMessage(chatId, messageId, `${t('success', lang)}! User deleted.\n\n` + menu.text, menu.reply_markup);
    return;
  }
  
  if (data.startsWith('admin_delete_post_')) {
    if (!isAdminUser) return;
    const postId = data.replace('admin_delete_post_', '');
    await supabase.from('post_images').delete().eq('post_id', postId);
    await supabase.from('post_link_previews').delete().eq('post_id', postId);
    await supabase.from('post_acknowledgments').delete().eq('post_id', postId);
    await supabase.from('post_replies').delete().eq('post_id', postId);
    await supabase.from('posts').delete().eq('id', postId);
    
    const menu = await buildAdminPostsMenu(0, lang);
    await editMessage(chatId, messageId, `${t('success', lang)}! Post deleted.\n\n` + menu.text, menu.reply_markup);
    return;
  }
  
  // ACoin purchase handling
  if (data.startsWith('buy_acoin_')) {
    if (!isLinked) return;
    const acoinAmount = parseInt(data.replace('buy_acoin_', ''));
    
    const priceUSD = acoinAmount * 0.01;
    const starsAmount = Math.max(1, Math.ceil(priceUSD / 0.013));
    
    const invoicePayload = {
      chat_id: chatId,
      title: `${acoinAmount.toLocaleString()} ACoin`,
      description: `Purchase ${acoinAmount.toLocaleString()} ACoin for your AfuChat wallet`,
      payload: JSON.stringify({ userId: tgUser.user_id, acoinAmount, type: 'acoin_purchase' }),
      currency: 'XTR',
      prices: [{ label: `${acoinAmount.toLocaleString()} ACoin`, amount: starsAmount }],
    };

    const invoiceResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendInvoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoicePayload),
    });

    const invoiceResult = await invoiceResponse.json();
    console.log('Invoice creation result:', invoiceResult);

    if (!invoiceResult.ok) {
      console.error('Failed to create invoice:', invoiceResult);
      await editMessage(chatId, messageId, `${t('error', lang)}: Failed to create payment. Please try again later.`, {
        inline_keyboard: [[{ text: t('back', lang), callback_data: 'menu_wallet' }]]
      });
    } else {
      await editMessage(chatId, messageId, `<b>${t('success', lang)}</b>

Invoice sent! Please complete the payment above.

<b>Package:</b> ${acoinAmount.toLocaleString()} ACoin
<b>Price:</b> ${starsAmount} Stars (~$${priceUSD.toFixed(2)})

<i>Your ACoin will be credited after payment.</i>`, {
        inline_keyboard: [[{ text: t('buyAcoin', lang), callback_data: 'buy_acoin' }], [{ text: t('wallet', lang), callback_data: 'menu_wallet' }]]
      });
    }
    return;
  }
  
  // Gift selection
  if (data.startsWith('gift_')) {
    if (!isLinked) return;
    const giftId = data.replace('gift_', '');
    
    const { data: gift } = await supabase.from('gifts').select('*, gift_statistics(price_multiplier, total_sent)').eq('id', giftId).single();
    
    if (!gift) {
      await editMessage(chatId, messageId, `${t('error', lang)}: Gift not found.`, {
        inline_keyboard: [[{ text: t('back', lang), callback_data: 'browse_gifts' }]]
      });
      return;
    }
    
    const price = Math.ceil(gift.base_xp_cost * (gift.gift_statistics?.price_multiplier || 1));
    
    await supabase.from('telegram_users').update({ current_menu: 'awaiting_gift_recipient', menu_data: { gift_id: giftId } }).eq('telegram_id', telegramUser.id);
    
    await editMessage(chatId, messageId, `${gift.emoji} <b>${gift.name}</b>

${gift.description || 'A beautiful gift!'}

<b>Rarity:</b> ${gift.rarity}
<b>Price:</b> ${price} Nexa
<b>Times Sent:</b> ${gift.gift_statistics?.total_sent || 0}

${t('enterRecipient', lang)}:`, {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'browse_gifts' }]]
    });
    return;
  }
  
  // Follow/unfollow
  if (data.startsWith('follow_')) {
    if (!isLinked || !tgUser.user_id) return;
    
    const targetUserId = data.replace('follow_', '');
    
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', tgUser.user_id)
      .eq('following_id', targetUserId)
      .single();
    
    if (existingFollow) {
      await supabase.from('follows').delete().eq('follower_id', tgUser.user_id).eq('following_id', targetUserId);
      await answerCallbackQuery(callbackQuery.id, 'Unfollowed');
    } else {
      await supabase.from('follows').insert({ follower_id: tgUser.user_id, following_id: targetUserId });
      await answerCallbackQuery(callbackQuery.id, 'Followed');
    }
    
    const { data: suggestedUsers } = await supabase
      .from('profiles')
      .select('id, display_name, handle, bio, avatar_url, is_verified, is_business_mode')
      .neq('id', tgUser.user_id)
      .order('xp', { ascending: false })
      .limit(5);
    
    const { data: following } = await supabase.from('follows').select('following_id').eq('follower_id', tgUser.user_id);
    const followingIds = (following || []).map((f: any) => f.following_id);
    
    const menu = buildSuggestedUsersMenu(suggestedUsers || [], followingIds, lang);
    await editMessage(chatId, messageId, menu.text, menu.reply_markup);
    return;
  }
  
  if (data.startsWith('unfollow_')) {
    if (!isLinked || !tgUser.user_id) return;
    
    const targetUserId = data.replace('unfollow_', '');
    await supabase.from('follows').delete().eq('follower_id', tgUser.user_id).eq('following_id', targetUserId);
    await answerCallbackQuery(callbackQuery.id, 'Unfollowed');
    
    const { data: following, count } = await supabase
      .from('follows')
      .select('following_id, profiles!follows_following_id_fkey(id, display_name, handle, is_verified)', { count: 'exact' })
      .eq('follower_id', tgUser.user_id)
      .order('created_at', { ascending: false })
      .range(0, 4);
    
    const followingProfiles = (following || []).map((f: any) => f.profiles).filter(Boolean);
    const menu = buildFollowingMenu(followingProfiles, 0, count || 0, lang);
    await editMessage(chatId, messageId, menu.text, menu.reply_markup);
    return;
  }
  
  // Pagination
  if (data.startsWith('followers_page_')) {
    if (!isLinked) return;
    const page = parseInt(data.replace('followers_page_', ''));
    
    const { data: followers, count } = await supabase
      .from('follows')
      .select('follower_id, profiles!follows_follower_id_fkey(id, display_name, handle, is_verified)', { count: 'exact' })
      .eq('following_id', tgUser.user_id)
      .order('created_at', { ascending: false })
      .range(page * 5, (page + 1) * 5 - 1);
    
    const followerProfiles = (followers || []).map((f: any) => f.profiles).filter(Boolean);
    const menu = buildFollowersMenu(followerProfiles, page, count || 0, lang);
    await editMessage(chatId, messageId, menu.text, menu.reply_markup);
    return;
  }
  
  if (data.startsWith('following_page_')) {
    if (!isLinked) return;
    const page = parseInt(data.replace('following_page_', ''));
    
    const { data: following, count } = await supabase
      .from('follows')
      .select('following_id, profiles!follows_following_id_fkey(id, display_name, handle, is_verified)', { count: 'exact' })
      .eq('follower_id', tgUser.user_id)
      .order('created_at', { ascending: false })
      .range(page * 5, (page + 1) * 5 - 1);
    
    const followingProfiles = (following || []).map((f: any) => f.profiles).filter(Boolean);
    const menu = buildFollowingMenu(followingProfiles, page, count || 0, lang);
    await editMessage(chatId, messageId, menu.text, menu.reply_markup);
    return;
  }
}

// ============================================
// MESSAGE HANDLER
// ============================================

async function handleMessage(message: any) {
  const chatId = message.chat.id;
  const text = message.text;
  const telegramUser = message.from;
  const photo = message.photo;
  
  // Handle /start command
  if (text === '/start') {
    const tgUser = await getOrCreateTelegramUser(telegramUser);
    const isLinked = tgUser?.is_linked && tgUser?.user_id;
    const lang = await getUserLang(tgUser);
    
    let profile = null;
    let isAdminUser = false;
    if (isLinked && tgUser.user_id) {
      const { data } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
      profile = data;
      isAdminUser = await isAdmin(tgUser.user_id);
    }
    
    const menu = buildMainMenu(isLinked, profile, isAdminUser, lang);
    await sendTelegramMessage(chatId, menu.text, menu.reply_markup);
    return;
  }
  
  // Handle /menu command
  if (text === '/menu') {
    const tgUser = await getOrCreateTelegramUser(telegramUser);
    const isLinked = tgUser?.is_linked && tgUser?.user_id;
    const lang = await getUserLang(tgUser);
    let profile = null;
    let isAdminUser = false;
    if (isLinked && tgUser.user_id) {
      const { data } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
      profile = data;
      isAdminUser = await isAdmin(tgUser.user_id);
    }
    const menu = buildMainMenu(isLinked, profile, isAdminUser, lang);
    await sendTelegramMessage(chatId, menu.text, menu.reply_markup);
    return;
  }
  
  // Handle /lang command
  if (text === '/lang') {
    const tgUser = await getOrCreateTelegramUser(telegramUser);
    const lang = await getUserLang(tgUser);
    const menu = buildLanguageMenu(lang);
    await sendTelegramMessage(chatId, menu.text, menu.reply_markup);
    return;
  }
  
  // Get user state
  const { data: tgUser } = await supabase
    .from('telegram_users')
    .select('*, profiles(*)')
    .eq('telegram_id', telegramUser.id)
    .single();
  
  if (!tgUser) return;
  
  const lang = await getUserLang(tgUser);
  const currentMenu = tgUser.current_menu;
  
  // Handle photo uploads
  if (photo && photo.length > 0) {
    const largestPhoto = photo[photo.length - 1];
    const fileId = largestPhoto.file_id;
    const fileSize = largestPhoto.file_size;
    
    if (currentMenu === 'awaiting_avatar') {
      await handleAvatarUpload(chatId, telegramUser, tgUser, fileId, lang);
      return;
    }
    
    if (currentMenu === 'awaiting_reg_avatar') {
      await handleRegistrationAvatar(chatId, telegramUser, tgUser, fileId, fileSize, lang);
      return;
    }
    
    if (currentMenu === 'awaiting_post_image') {
      await handlePostWithImage(chatId, telegramUser, tgUser, fileId, message.caption || '', lang);
      return;
    }
    
    if (currentMenu === 'awaiting_story_image') {
      await handleStoryImageUpload(chatId, telegramUser, tgUser, fileId, lang);
      return;
    }
  }
  
  // Handle text inputs
  if (!text) return;
  
  switch (currentMenu) {
    case 'awaiting_display_name':
      await handleDisplayNameUpdate(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_handle':
      await handleHandleUpdate(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_bio':
      await handleBioUpdate(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_country':
      await handleCountryUpdate(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_dob':
      await handleDobUpdate(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_post':
      await handleNewPost(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_story_text':
      await handleTextStory(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_convert_amount':
      await handleConvertNexa(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_nexa_recipient':
      await handleSendNexaRecipient(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_send_amount':
      await handleSendNexaAmount(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_acoin_recipient':
      await handleSendACoinRecipient(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_acoin_amount':
      await handleSendACoinAmount(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_gift_recipient':
      await handleGiftRecipient(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_red_envelope_amount':
      await handleRedEnvelopeAmount(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_red_envelope_count':
      await handleRedEnvelopeCount(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_link_code':
      await handleLinkCode(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_reg_email':
      await handleRegistrationEmail(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_reg_password':
      await handleRegistrationPassword(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_reg_username':
      await handleRegistrationUsername(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_reg_dob':
      await handleRegistrationDob(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'awaiting_reg_country':
      await handleRegistrationCountry(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'admin_awaiting_user_search':
      await handleAdminUserSearch(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'admin_awaiting_nexa_amount':
      await handleAdminGiveNexa(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'admin_awaiting_acoin_amount':
      await handleAdminGiveACoin(chatId, telegramUser, tgUser, text, lang);
      break;
      
    case 'admin_awaiting_broadcast':
      await handleAdminBroadcast(chatId, telegramUser, tgUser, text, lang);
      break;
  }
}

// ============================================
// INPUT HANDLERS
// ============================================

async function handleDisplayNameUpdate(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const displayName = text.trim().slice(0, 50);
  
  await supabase.from('profiles').update({ display_name: displayName }).eq('id', tgUser.user_id);
  await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
  
  const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
  const menu = buildEditProfileMenu(freshProfile, lang);
  await sendTelegramMessage(chatId, `${t('success', lang)}!\n\n` + menu.text, menu.reply_markup);
}

async function handleHandleUpdate(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const handle = text.trim().replace('@', '').toLowerCase();
  const handleRegex = /^[a-z0-9_]{3,30}$/;
  
  if (!handleRegex.test(handle)) {
    await sendTelegramMessage(chatId, t('invalidUsername', lang), {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'edit_profile' }]]
    });
    return;
  }
  
  const { data: existingHandle } = await supabase.from('profiles').select('id').ilike('handle', handle).neq('id', tgUser.user_id).maybeSingle();
  
  if (existingHandle) {
    await sendTelegramMessage(chatId, t('usernameTaken', lang), {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'edit_profile' }]]
    });
    return;
  }
  
  await supabase.from('profiles').update({ handle }).eq('id', tgUser.user_id);
  await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
  
  const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
  const menu = buildEditProfileMenu(freshProfile, lang);
  await sendTelegramMessage(chatId, `${t('success', lang)}!\n\n` + menu.text, menu.reply_markup);
}

async function handleBioUpdate(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const bio = text.trim().slice(0, 160);
  
  await supabase.from('profiles').update({ bio }).eq('id', tgUser.user_id);
  await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
  
  const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
  const menu = buildEditProfileMenu(freshProfile, lang);
  await sendTelegramMessage(chatId, `${t('success', lang)}!\n\n` + menu.text, menu.reply_markup);
}

async function handleCountryUpdate(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const inputCountry = text.trim();
  const matchedCountry = VALID_COUNTRIES.find(c => c.toLowerCase() === inputCountry.toLowerCase());
  
  if (!matchedCountry) {
    const partialMatch = VALID_COUNTRIES.find(c => c.toLowerCase().includes(inputCountry.toLowerCase()));
    if (partialMatch) {
      await sendTelegramMessage(chatId, t('didYouMean', lang, { country: partialMatch }), {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'edit_profile' }]]
      });
    } else {
      await sendTelegramMessage(chatId, t('countryNotFound', lang), {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'edit_profile' }]]
      });
    }
    return;
  }
  
  await supabase.from('profiles').update({ country: matchedCountry }).eq('id', tgUser.user_id);
  await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
  
  const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
  const menu = buildEditProfileMenu(freshProfile, lang);
  await sendTelegramMessage(chatId, `${t('success', lang)}!\n\n` + menu.text, menu.reply_markup);
}

async function handleDobUpdate(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const dobString = text.trim();
  const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!dobRegex.test(dobString)) {
    await sendTelegramMessage(chatId, t('invalidDobFormat', lang), {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'edit_profile' }]]
    });
    return;
  }
  
  const dob = new Date(dobString);
  if (isNaN(dob.getTime()) || dob > new Date()) {
    await sendTelegramMessage(chatId, t('invalidDate', lang), {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'edit_profile' }]]
    });
    return;
  }
  
  await supabase.from('profiles').update({ date_of_birth: dobString }).eq('id', tgUser.user_id);
  await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
  
  const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
  const menu = buildEditProfileMenu(freshProfile, lang);
  await sendTelegramMessage(chatId, `${t('success', lang)}!\n\n` + menu.text, menu.reply_markup);
}

async function handleAvatarUpload(chatId: number, telegramUser: any, tgUser: any, fileId: string, lang: Lang) {
  try {
    const fileInfo = await getFile(fileId);
    if (!fileInfo.ok || !fileInfo.result.file_path) {
      throw new Error('Failed to get file info');
    }
    
    const fileData = await downloadFile(fileInfo.result.file_path);
    const ext = fileInfo.result.file_path.split('.').pop() || 'jpg';
    const filename = `${tgUser.user_id}/avatar_${Date.now()}.${ext}`;
    
    await supabase.storage.from('avatars').upload(filename, fileData, { 
      contentType: `image/${ext}`,
      upsert: true 
    });
    
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filename);
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', tgUser.user_id);
    await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
    
    const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', tgUser.user_id).single();
    const { count: followerCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', tgUser.user_id);
    const { count: followingCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', tgUser.user_id);
    
    const menu = buildProfileMenu(freshProfile, followerCount || 0, followingCount || 0, lang);
    await sendTelegramMessage(chatId, `${t('success', lang)}! Avatar updated.\n\n` + menu.text, menu.reply_markup);
  } catch (err) {
    console.error('Avatar upload error:', err);
    await sendTelegramMessage(chatId, `${t('error', lang)}: Failed to upload avatar.`, {
      inline_keyboard: [[{ text: t('back', lang), callback_data: 'edit_profile' }]]
    });
    await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
  }
}

async function handleNewPost(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const content = text.trim();
  
  if (content.length < 1 || content.length > 5000) {
    await sendTelegramMessage(chatId, `${t('error', lang)}: Post must be between 1 and 5000 characters.`, {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_feed' }]]
    });
    return;
  }
  
  await supabase.from('posts').insert({
    author_id: tgUser.user_id,
    content
  });
  
  await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
  
  await sendTelegramMessage(chatId, `${t('success', lang)}! Post created.`, {
    inline_keyboard: [[{ text: t('feed', lang), callback_data: 'menu_feed' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
  });
}

async function handlePostWithImage(chatId: number, telegramUser: any, tgUser: any, fileId: string, caption: string, lang: Lang) {
  try {
    const fileInfo = await getFile(fileId);
    if (!fileInfo.ok || !fileInfo.result.file_path) {
      throw new Error('Failed to get file info');
    }
    
    const fileData = await downloadFile(fileInfo.result.file_path);
    const ext = fileInfo.result.file_path.split('.').pop() || 'jpg';
    const filename = `${tgUser.user_id}/post_${Date.now()}.${ext}`;
    
    await supabase.storage.from('posts').upload(filename, fileData, { 
      contentType: `image/${ext}`,
      upsert: true 
    });
    
    const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(filename);
    
    const { data: post } = await supabase.from('posts').insert({
      author_id: tgUser.user_id,
      content: caption || 'Shared a photo',
      image_url: publicUrl
    }).select().single();
    
    if (post) {
      await supabase.from('post_images').insert({
        post_id: post.id,
        image_url: publicUrl
      });
    }
    
    await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
    
    await sendTelegramMessage(chatId, `${t('success', lang)}! Post with image created.`, {
      inline_keyboard: [[{ text: t('feed', lang), callback_data: 'menu_feed' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
    });
  } catch (err) {
    console.error('Post image upload error:', err);
    await sendTelegramMessage(chatId, `${t('error', lang)}: Failed to create post.`, {
      inline_keyboard: [[{ text: t('back', lang), callback_data: 'menu_feed' }]]
    });
    await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
  }
}

async function handleTextStory(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const content = text.trim();
  
  await supabase.from('stories').insert({
    user_id: tgUser.user_id,
    text_content: content,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
  
  await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
  
  await sendTelegramMessage(chatId, `${t('success', lang)}! Story created.`, {
    inline_keyboard: [[{ text: t('stories', lang), callback_data: 'menu_stories' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
  });
}

async function handleStoryImageUpload(chatId: number, telegramUser: any, tgUser: any, fileId: string, lang: Lang) {
  try {
    const fileInfo = await getFile(fileId);
    if (!fileInfo.ok || !fileInfo.result.file_path) {
      throw new Error('Failed to get file info');
    }
    
    const fileData = await downloadFile(fileInfo.result.file_path);
    const ext = fileInfo.result.file_path.split('.').pop() || 'jpg';
    const filename = `${tgUser.user_id}/story_${Date.now()}.${ext}`;
    
    await supabase.storage.from('stories').upload(filename, fileData, { 
      contentType: `image/${ext}`,
      upsert: true 
    });
    
    const { data: { publicUrl } } = supabase.storage.from('stories').getPublicUrl(filename);
    
    await supabase.from('stories').insert({
      user_id: tgUser.user_id,
      media_url: publicUrl,
      media_type: 'image',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
    
    await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
    
    await sendTelegramMessage(chatId, `${t('success', lang)}! Story created.`, {
      inline_keyboard: [[{ text: t('stories', lang), callback_data: 'menu_stories' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
    });
  } catch (err) {
    console.error('Story upload error:', err);
    await sendTelegramMessage(chatId, `${t('error', lang)}: Failed to create story.`, {
      inline_keyboard: [[{ text: t('back', lang), callback_data: 'menu_stories' }]]
    });
    await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
  }
}

async function handleConvertNexa(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const amount = parseInt(text.trim());
  
  if (isNaN(amount) || amount <= 0) {
    await sendTelegramMessage(chatId, `${t('error', lang)}: ${t('enterAmount', lang)}`, {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_wallet' }]]
    });
    return;
  }
  
  const { data: userProfile } = await supabase.from('profiles').select('xp, acoin').eq('id', tgUser.user_id).single();
  
  if (!userProfile || userProfile.xp < amount) {
    await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
    await sendTelegramMessage(chatId, t('insufficientBalance', lang), {
      inline_keyboard: [[{ text: t('wallet', lang), callback_data: 'menu_wallet' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
    });
    return;
  }
  
  const { data: settings } = await supabase.from('currency_settings').select('nexa_to_acoin_rate, conversion_fee_percent').limit(1).single();
  
  const conversionRate = settings?.nexa_to_acoin_rate || 100;
  const feePercent = settings?.conversion_fee_percent || 5.99;
  
  const feeAmount = Math.ceil(amount * feePercent / 100);
  const nexaAfterFee = amount - feeAmount;
  const acoinReceived = Math.floor(nexaAfterFee / conversionRate);
  
  if (acoinReceived < 1) {
    await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
    await sendTelegramMessage(chatId, t('amountTooSmall', lang), {
      inline_keyboard: [[{ text: t('back', lang), callback_data: 'convert_nexa' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
    });
    return;
  }
  
  const newNexa = userProfile.xp - amount;
  const newAcoin = (userProfile.acoin || 0) + acoinReceived;
  
  await supabase.from('profiles').update({ xp: newNexa, acoin: newAcoin }).eq('id', tgUser.user_id);
  await supabase.from('acoin_transactions').insert({
    user_id: tgUser.user_id,
    amount: acoinReceived,
    transaction_type: 'conversion',
    nexa_spent: amount,
    fee_charged: feeAmount
  });
  
  await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
  
  await sendTelegramMessage(chatId, `<b>${t('conversionSuccess', lang)}</b>

${t('converted', lang, { from: amount.toLocaleString(), to: acoinReceived.toLocaleString() })}
(${t('fee', lang)}: ${feeAmount.toLocaleString()} Nexa)

<b>${t('newBalances', lang)}:</b>
• ${t('nexa', lang)}: ${newNexa.toLocaleString()}
• ${t('acoin', lang)}: ${newAcoin.toLocaleString()}`, {
    inline_keyboard: [[{ text: t('wallet', lang), callback_data: 'menu_wallet' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
  });
}

async function handleSendNexaRecipient(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const recipientHandle = text.trim().replace('@', '').toLowerCase();
  
  const { data: recipient } = await supabase.from('profiles').select('id, display_name').ilike('handle', recipientHandle).single();
  
  if (!recipient) {
    await sendTelegramMessage(chatId, t('userNotFound', lang), {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_wallet' }]]
    });
    return;
  }
  
  if (recipient.id === tgUser.user_id) {
    await sendTelegramMessage(chatId, t('cannotSendToSelf', lang), {
      inline_keyboard: [[{ text: t('back', lang), callback_data: 'menu_wallet' }]]
    });
    return;
  }
  
  await supabase.from('telegram_users').update({
    current_menu: 'awaiting_send_amount',
    menu_data: { recipient_id: recipient.id, recipient_name: recipient.display_name }
  }).eq('telegram_id', telegramUser.id);
  
  await sendTelegramMessage(chatId, `<b>${t('sendingTo', lang)}:</b> ${recipient.display_name}\n\n${t('enterAmount', lang)}:`, {
    inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_wallet' }]]
  });
}

async function handleSendNexaAmount(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const amount = parseInt(text.trim());
  const recipientId = tgUser.menu_data?.recipient_id;
  const recipientName = tgUser.menu_data?.recipient_name;
  
  if (isNaN(amount) || amount <= 0) {
    await sendTelegramMessage(chatId, `${t('error', lang)}: ${t('enterAmount', lang)}`, {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_wallet' }]]
    });
    return;
  }
  
  const { data: senderProfile } = await supabase.from('profiles').select('xp').eq('id', tgUser.user_id).single();
  
  if (!senderProfile || senderProfile.xp < amount) {
    await supabase.from('telegram_users').update({ current_menu: 'main', menu_data: {} }).eq('telegram_id', telegramUser.id);
    await sendTelegramMessage(chatId, t('insufficientBalance', lang), {
      inline_keyboard: [[{ text: t('wallet', lang), callback_data: 'menu_wallet' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
    });
    return;
  }
  
  const { data: receiverProfile } = await supabase.from('profiles').select('xp').eq('id', recipientId).single();
  
  await supabase.from('profiles').update({ xp: senderProfile.xp - amount }).eq('id', tgUser.user_id);
  await supabase.from('profiles').update({ xp: (receiverProfile?.xp || 0) + amount }).eq('id', recipientId);
  await supabase.from('tips').insert({ sender_id: tgUser.user_id, receiver_id: recipientId, xp_amount: amount });
  
  await supabase.from('telegram_users').update({ current_menu: 'main', menu_data: {} }).eq('telegram_id', telegramUser.id);
  
  await sendTelegramMessage(chatId, `<b>${t('transferSuccess', lang)}</b>\n\n${t('youSent', lang, { amount: amount.toLocaleString(), currency: t('nexa', lang), name: recipientName })}`, {
    inline_keyboard: [[{ text: t('wallet', lang), callback_data: 'menu_wallet' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
  });
}

async function handleSendACoinRecipient(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const recipientHandle = text.trim().replace('@', '').toLowerCase();
  
  const { data: recipient } = await supabase.from('profiles').select('id, display_name').ilike('handle', recipientHandle).single();
  
  if (!recipient) {
    await sendTelegramMessage(chatId, t('userNotFound', lang), {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_wallet' }]]
    });
    return;
  }
  
  if (recipient.id === tgUser.user_id) {
    await sendTelegramMessage(chatId, t('cannotSendToSelf', lang), {
      inline_keyboard: [[{ text: t('back', lang), callback_data: 'menu_wallet' }]]
    });
    return;
  }
  
  await supabase.from('telegram_users').update({
    current_menu: 'awaiting_acoin_amount',
    menu_data: { recipient_id: recipient.id, recipient_name: recipient.display_name }
  }).eq('telegram_id', telegramUser.id);
  
  await sendTelegramMessage(chatId, `<b>${t('sendingTo', lang)}:</b> ${recipient.display_name}\n\n${t('enterAmount', lang)}:`, {
    inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_wallet' }]]
  });
}

async function handleSendACoinAmount(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const amount = parseInt(text.trim());
  const recipientId = tgUser.menu_data?.recipient_id;
  const recipientName = tgUser.menu_data?.recipient_name;
  
  if (isNaN(amount) || amount <= 0) {
    await sendTelegramMessage(chatId, `${t('error', lang)}: ${t('enterAmount', lang)}`, {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_wallet' }]]
    });
    return;
  }
  
  const { data: senderProfile } = await supabase.from('profiles').select('acoin').eq('id', tgUser.user_id).single();
  
  if (!senderProfile || (senderProfile.acoin || 0) < amount) {
    await supabase.from('telegram_users').update({ current_menu: 'main', menu_data: {} }).eq('telegram_id', telegramUser.id);
    await sendTelegramMessage(chatId, t('insufficientBalance', lang), {
      inline_keyboard: [[{ text: t('wallet', lang), callback_data: 'menu_wallet' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
    });
    return;
  }
  
  const { data: receiverProfile } = await supabase.from('profiles').select('acoin').eq('id', recipientId).single();
  
  await supabase.from('profiles').update({ acoin: (senderProfile.acoin || 0) - amount }).eq('id', tgUser.user_id);
  await supabase.from('profiles').update({ acoin: (receiverProfile?.acoin || 0) + amount }).eq('id', recipientId);
  
  await supabase.from('acoin_transactions').insert({ user_id: tgUser.user_id, amount: -amount, transaction_type: 'p2p_send' });
  await supabase.from('acoin_transactions').insert({ user_id: recipientId, amount: amount, transaction_type: 'p2p_receive' });
  
  await supabase.from('telegram_users').update({ current_menu: 'main', menu_data: {} }).eq('telegram_id', telegramUser.id);
  
  await sendTelegramMessage(chatId, `<b>${t('transferSuccess', lang)}</b>\n\n${t('youSent', lang, { amount: amount.toLocaleString(), currency: t('acoin', lang), name: recipientName })}`, {
    inline_keyboard: [[{ text: t('wallet', lang), callback_data: 'menu_wallet' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
  });
}

async function handleGiftRecipient(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const recipientHandle = text.trim().replace('@', '').toLowerCase();
  const giftId = tgUser.menu_data?.gift_id;
  
  const { data: recipient } = await supabase.from('profiles').select('id, display_name').ilike('handle', recipientHandle).single();
  
  if (!recipient) {
    await sendTelegramMessage(chatId, t('userNotFound', lang), {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'browse_gifts' }]]
    });
    return;
  }
  
  if (recipient.id === tgUser.user_id) {
    await sendTelegramMessage(chatId, t('cannotSendToSelf', lang), {
      inline_keyboard: [[{ text: t('back', lang), callback_data: 'browse_gifts' }]]
    });
    return;
  }
  
  const { data: gift } = await supabase.from('gifts').select('base_xp_cost, name').eq('id', giftId).single();
  const { data: giftStats } = await supabase.from('gift_statistics').select('price_multiplier').eq('gift_id', giftId).single();
  
  const giftPrice = Math.ceil((gift?.base_xp_cost || 0) * (giftStats?.price_multiplier || 1));
  
  const { data: senderProfile } = await supabase.from('profiles').select('xp').eq('id', tgUser.user_id).single();
  
  if (!senderProfile || senderProfile.xp < giftPrice) {
    await supabase.from('telegram_users').update({ current_menu: 'main', menu_data: {} }).eq('telegram_id', telegramUser.id);
    await sendTelegramMessage(chatId, `${t('insufficientBalance', lang)} ${t('giftCost', lang, { cost: giftPrice.toLocaleString() })}`, {
      inline_keyboard: [[{ text: t('wallet', lang), callback_data: 'menu_wallet' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
    });
    return;
  }
  
  await supabase.from('profiles').update({ xp: senderProfile.xp - giftPrice }).eq('id', tgUser.user_id);
  await supabase.from('gift_transactions').insert({ gift_id: giftId, sender_id: tgUser.user_id, receiver_id: recipient.id, xp_cost: giftPrice });
  await supabase.from('gift_statistics').upsert({
    gift_id: giftId,
    total_sent: (giftStats?.price_multiplier ? 1 : 0) + 1,
    price_multiplier: Math.min((giftStats?.price_multiplier || 1) + 0.01, 3.00),
    last_updated: new Date().toISOString()
  }, { onConflict: 'gift_id' });
  
  await supabase.from('telegram_users').update({ current_menu: 'main', menu_data: {} }).eq('telegram_id', telegramUser.id);
  
  await sendTelegramMessage(chatId, `<b>${t('giftSent', lang)}</b>\n\n${t('youSentGift', lang, { gift: gift?.name || 'Gift', name: recipient.display_name })}`, {
    inline_keyboard: [[{ text: t('sendMore', lang), callback_data: 'browse_gifts' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
  });
}

async function handleRedEnvelopeAmount(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const amount = parseInt(text.trim());
  
  if (isNaN(amount) || amount < 100) {
    await sendTelegramMessage(chatId, t('minAmount', lang, { min: '100' }), {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_red_envelopes' }]]
    });
    return;
  }
  
  const { data: userProfile } = await supabase.from('profiles').select('xp').eq('id', tgUser.user_id).single();
  
  if (!userProfile || userProfile.xp < amount) {
    await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
    await sendTelegramMessage(chatId, t('insufficientBalance', lang), {
      inline_keyboard: [[{ text: t('wallet', lang), callback_data: 'menu_wallet' }]]
    });
    return;
  }
  
  await supabase.from('telegram_users').update({
    current_menu: 'awaiting_red_envelope_count',
    menu_data: { envelope_amount: amount }
  }).eq('telegram_id', telegramUser.id);
  
  await sendTelegramMessage(chatId, t('howManyCanClaim', lang), {
    inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_red_envelopes' }]]
  });
}

async function handleRedEnvelopeCount(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const count = parseInt(text.trim());
  const amount = tgUser.menu_data?.envelope_amount;
  
  if (isNaN(count) || count < 1 || count > 100) {
    await sendTelegramMessage(chatId, t('invalidNumber', lang), {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'menu_red_envelopes' }]]
    });
    return;
  }
  
  const { data: userProfile } = await supabase.from('profiles').select('xp').eq('id', tgUser.user_id).single();
  
  if (!userProfile || userProfile.xp < amount) {
    await supabase.from('telegram_users').update({ current_menu: 'main', menu_data: {} }).eq('telegram_id', telegramUser.id);
    await sendTelegramMessage(chatId, t('insufficientBalance', lang), {
      inline_keyboard: [[{ text: t('wallet', lang), callback_data: 'menu_wallet' }]]
    });
    return;
  }
  
  const { error: deductError } = await supabase
    .from('profiles')
    .update({ xp: userProfile.xp - amount })
    .eq('id', tgUser.user_id);
  
  if (deductError) {
    console.error('Failed to deduct XP:', deductError);
    await sendTelegramMessage(chatId, `${t('error', lang)}: Failed to create red envelope.`, {
      inline_keyboard: [[{ text: t('back', lang), callback_data: 'create_red_envelope' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
    });
    return;
  }
  
  const { data: envelope, error: envelopeError } = await supabase
    .from('red_envelopes')
    .insert({
      sender_id: tgUser.user_id,
      total_amount: amount,
      recipient_count: count,
      envelope_type: 'random',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
    .select('id')
    .single();
  
  if (envelopeError || !envelope) {
    console.error('Failed to create envelope:', envelopeError);
    await supabase.from('profiles').update({ xp: userProfile.xp }).eq('id', tgUser.user_id);
    await sendTelegramMessage(chatId, `${t('error', lang)}: Failed to create red envelope.`, {
      inline_keyboard: [[{ text: t('back', lang), callback_data: 'create_red_envelope' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
    });
    return;
  }
  
  await supabase.from('user_activity_log').insert({
    user_id: tgUser.user_id,
    action_type: 'red_envelope_sent',
    xp_earned: -amount,
    metadata: { envelope_id: envelope.id, recipients: count, source: 'telegram' }
  });
  
  await supabase.from('telegram_users').update({ current_menu: 'main', menu_data: {} }).eq('telegram_id', telegramUser.id);
  
  const shareUrl = `https://afuchat.com/red-envelope?claim=${envelope.id}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Claim your lucky Nexa from my Red Envelope on AfuChat!')}`;
  
  await sendTelegramMessage(chatId, `<b>${t('envelopeCreated', lang)}</b>

<b>${t('amount', lang)}:</b> ${amount.toLocaleString()} Nexa
<b>${t('canClaim', lang)}:</b> ${count} ${t('people', lang)}
<b>${t('expires', lang)}:</b> 24 ${t('hours', lang)}

<b>${t('shareWithFriends', lang)}:</b>
${shareUrl}`, {
    inline_keyboard: [
      [{ text: t('shareOnTelegram', lang), url: telegramShareUrl }],
      [{ text: t('createAnother', lang), callback_data: 'create_red_envelope' }],
      [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]
    ]
  });
}

async function handleLinkCode(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const { data: linkUser } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('link_token', text.trim().toUpperCase())
    .gt('link_token_expires_at', new Date().toISOString())
    .single();
  
  if (linkUser && linkUser.user_id) {
    if (linkUser.telegram_id !== telegramUser.id) {
      await supabase.from('telegram_users').delete().eq('telegram_id', telegramUser.id);
    }
    
    await supabase.from('telegram_users').update({
      telegram_id: telegramUser.id,
      telegram_username: telegramUser.username,
      telegram_first_name: telegramUser.first_name,
      telegram_last_name: telegramUser.last_name,
      is_linked: true,
      link_token: null,
      link_token_expires_at: null,
      current_menu: 'main'
    }).eq('id', linkUser.id);
    
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', linkUser.user_id).single();
    const isAdminUser = await isAdmin(linkUser.user_id);
    const menu = buildMainMenu(true, profile, isAdminUser, lang);
    await sendTelegramMessage(chatId, `<b>${t('accountLinkedSuccess', lang)}</b>\n\n${t('welcomeBack', lang, { name: profile?.display_name || 'User' })}\n\n` + menu.text, menu.reply_markup);
  } else {
    await sendTelegramMessage(chatId, t('invalidLinkCode', lang), {
      inline_keyboard: [[{ text: t('back', lang), callback_data: 'link_account' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
    });
  }
}

// ============================================
// REGISTRATION HANDLERS
// ============================================

async function handleRegistrationEmail(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const email = text.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    await sendTelegramMessage(chatId, t('invalidEmail', lang), {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'main_menu' }]]
    });
    return;
  }
  
  const { data: existingUser } = await supabase.auth.admin.listUsers();
  const emailExists = existingUser?.users?.some(u => u.email?.toLowerCase() === email);
  
  if (emailExists) {
    await sendTelegramMessage(chatId, t('emailExists', lang), {
      inline_keyboard: [
        [{ text: t('linkAccount', lang), callback_data: 'link_account' }],
        [{ text: t('tryDifferentEmail', lang), callback_data: 'start_registration' }],
        [{ text: t('cancel', lang), callback_data: 'main_menu' }]
      ]
    });
    return;
  }
  
  await supabase.from('telegram_users').update({ 
    current_menu: 'awaiting_reg_password', 
    menu_data: { email } 
  }).eq('telegram_id', telegramUser.id);
  
  await sendTelegramMessage(chatId, `<b>Step 2/7</b>

${t('emailSet', lang)}: <code>${email}</code>

${t('enterPassword', lang)}:`, {
    inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'main_menu' }]]
  });
}

async function handleRegistrationPassword(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const password = text.trim();
  
  if (password.length < 6) {
    await sendTelegramMessage(chatId, t('passwordTooShort', lang), {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'main_menu' }]]
    });
    return;
  }
  
  const menuData = { ...tgUser.menu_data, password };
  await supabase.from('telegram_users').update({ 
    current_menu: 'awaiting_reg_username', 
    menu_data: menuData 
  }).eq('telegram_id', telegramUser.id);
  
  await sendTelegramMessage(chatId, `<b>Step 3/7</b>

${t('passwordSet', lang)}

${t('chooseUsername', lang)}

${t('usernameExample', lang)}`, {
    inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'main_menu' }]]
  });
}

async function handleRegistrationUsername(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const handle = text.trim().replace('@', '').toLowerCase();
  const handleRegex = /^[a-z0-9_]{3,20}$/;
  
  if (!handleRegex.test(handle)) {
    await sendTelegramMessage(chatId, t('invalidUsername', lang), {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'main_menu' }]]
    });
    return;
  }
  
  const { data: existingHandle } = await supabase.from('profiles').select('id').ilike('handle', handle).maybeSingle();
  
  if (existingHandle) {
    await sendTelegramMessage(chatId, t('usernameTaken', lang), {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'main_menu' }]]
    });
    return;
  }
  
  const menuData = { ...tgUser.menu_data, handle };
  await supabase.from('telegram_users').update({ 
    current_menu: 'awaiting_reg_dob', 
    menu_data: menuData 
  }).eq('telegram_id', telegramUser.id);
  
  await sendTelegramMessage(chatId, `<b>Step 4/7</b>

${t('usernameSet', lang)}: @${handle}

${t('enterDob', lang)}
${t('dobFormat', lang)}
${t('dobExample', lang)}

<i>${t('mustBe13', lang)}</i>`, {
    inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'main_menu' }]]
  });
}

async function handleRegistrationDob(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const dobString = text.trim();
  const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!dobRegex.test(dobString)) {
    await sendTelegramMessage(chatId, t('invalidDobFormat', lang), {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'main_menu' }]]
    });
    return;
  }
  
  const dob = new Date(dobString);
  const today = new Date();
  const age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  
  if (isNaN(dob.getTime()) || dob > today) {
    await sendTelegramMessage(chatId, t('invalidDate', lang), {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'main_menu' }]]
    });
    return;
  }
  
  if (age < 13) {
    await sendTelegramMessage(chatId, t('mustBe13', lang), {
      inline_keyboard: [[{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
    });
    await supabase.from('telegram_users').update({ current_menu: 'main', menu_data: {} }).eq('telegram_id', telegramUser.id);
    return;
  }
  
  const menuData = { ...tgUser.menu_data, dob: dobString };
  await supabase.from('telegram_users').update({ 
    current_menu: 'awaiting_reg_country', 
    menu_data: menuData 
  }).eq('telegram_id', telegramUser.id);
  
  await sendTelegramMessage(chatId, `<b>Step 5/7</b>

${t('dobSet', lang)}: ${dobString}

${t('enterCountry', lang)}
${t('countryExample', lang)}`, {
    inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'main_menu' }]]
  });
}

async function handleRegistrationCountry(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const inputCountry = text.trim();
  
  const matchedCountry = VALID_COUNTRIES.find(c => c.toLowerCase() === inputCountry.toLowerCase());
  
  if (!matchedCountry) {
    const partialMatch = VALID_COUNTRIES.find(c => c.toLowerCase().includes(inputCountry.toLowerCase()));
    
    if (partialMatch) {
      await sendTelegramMessage(chatId, t('didYouMean', lang, { country: partialMatch }), {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'main_menu' }]]
      });
    } else {
      await sendTelegramMessage(chatId, t('countryNotFound', lang), {
        inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'main_menu' }]]
      });
    }
    return;
  }
  
  const menuData = { ...tgUser.menu_data, country: matchedCountry };
  await supabase.from('telegram_users').update({ 
    current_menu: 'awaiting_reg_language', 
    menu_data: menuData 
  }).eq('telegram_id', telegramUser.id);
  
  await sendTelegramMessage(chatId, `<b>Step 6/7</b>

${t('countrySet', lang)}: ${matchedCountry}

${t('selectLanguage', lang)}:`, {
    inline_keyboard: [
      [{ text: 'English', callback_data: 'reg_lang_en' }, { text: 'Español', callback_data: 'reg_lang_es' }],
      [{ text: 'Français', callback_data: 'reg_lang_fr' }, { text: 'العربية', callback_data: 'reg_lang_ar' }],
      [{ text: 'Swahili', callback_data: 'reg_lang_sw' }],
      [{ text: t('cancel', lang), callback_data: 'main_menu' }]
    ]
  });
}

async function handleRegistrationLanguage(chatId: number, messageId: number, telegramUser: any, tgUser: any, newLang: Lang) {
  const menuData = { ...tgUser.menu_data, language: newLang };
  await supabase.from('telegram_users').update({ 
    current_menu: 'awaiting_reg_avatar', 
    menu_data: menuData,
    preferred_language: newLang
  }).eq('telegram_id', telegramUser.id);
  
  await editMessage(chatId, messageId, `<b>Step 7/7</b>

${t('languageSet', newLang)}: ${getLangName(newLang)}

<b>${t('finalStep', newLang)}</b>

${t('sendPhoto', newLang)}

<i>${t('photoMaxSize', newLang)}</i>`, {
    inline_keyboard: [
      [{ text: t('skipForNow', newLang), callback_data: 'reg_skip_avatar' }],
      [{ text: t('cancel', newLang), callback_data: 'main_menu' }]
    ]
  });
}

async function handleRegistrationAvatar(chatId: number, telegramUser: any, tgUser: any, fileId: string, fileSize?: number, lang: Lang = 'en') {
  const MAX_SIZE = 5 * 1024 * 1024;
  
  if (fileSize && fileSize > MAX_SIZE) {
    await sendTelegramMessage(chatId, t('imageTooLarge', lang), {
      inline_keyboard: [
        [{ text: t('skipForNow', lang), callback_data: 'reg_skip_avatar' }],
        [{ text: t('cancel', lang), callback_data: 'main_menu' }]
      ]
    });
    return;
  }
  
  await sendTelegramMessage(chatId, t('creatingAccount', lang));
  
  const { email, password, handle, dob, country, language } = tgUser.menu_data;
  const displayName = telegramUser.first_name + (telegramUser.last_name ? ' ' + telegramUser.last_name : '');
  
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, handle }
  });
  
  if (authError || !authData.user) {
    await sendTelegramMessage(chatId, `${t('registrationFailed', lang)}: ${authError?.message || 'Unknown error'}`, {
      inline_keyboard: [[{ text: t('tryAgain', lang), callback_data: 'create_account' }], [{ text: t('mainMenu', lang), callback_data: 'main_menu' }]]
    });
    await supabase.from('telegram_users').update({ current_menu: 'main', menu_data: {} }).eq('telegram_id', telegramUser.id);
    return;
  }
  
  const userId = authData.user.id;
  const userLang = language as Lang || lang;
  
  let avatarUrl = null;
  try {
    const fileInfo = await getFile(fileId);
    if (fileInfo.ok && fileInfo.result.file_path) {
      const fileData = await downloadFile(fileInfo.result.file_path);
      const ext = fileInfo.result.file_path.split('.').pop() || 'jpg';
      const filename = `${userId}/avatar.${ext}`;
      
      await supabase.storage.from('avatars').upload(filename, fileData, { 
        contentType: `image/${ext}`,
        upsert: true 
      });
      
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filename);
      avatarUrl = publicUrl;
    }
  } catch (err) {
    console.error('Failed to upload avatar:', err);
  }
  
  await supabase.from('profiles').update({
    handle,
    date_of_birth: dob,
    country,
    language: userLang,
    ...(avatarUrl && { avatar_url: avatarUrl })
  }).eq('id', userId);
  
  await supabase.from('telegram_users').update({ 
    user_id: userId, 
    is_linked: true, 
    current_menu: 'main', 
    menu_data: {},
    preferred_language: userLang
  }).eq('telegram_id', telegramUser.id);
  
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  const menu = buildMainMenu(true, profile, false, userLang);
  
  await sendTelegramMessage(chatId, `<b>${t('accountCreated', userLang)}</b>

${t('welcomeTo', userLang, { name: displayName })}

• ${t('email', userLang)}: ${email}
• ${t('username', userLang)}: @${handle}
• ${t('country', userLang)}: ${country}

${t('loginAt', userLang)}

` + menu.text, menu.reply_markup);
}

async function completeRegistrationWithoutAvatar(chatId: number, messageId: number, telegramUser: any, tgUser: any) {
  const lang = tgUser.menu_data?.language as Lang || 'en';
  
  await editMessage(chatId, messageId, t('creatingAccount', lang), { inline_keyboard: [] });
  
  const { email, password, handle, dob, country, language } = tgUser.menu_data;
  const displayName = telegramUser.first_name + (telegramUser.last_name ? ' ' + telegramUser.last_name : '');
  const userLang = language as Lang || lang;
  
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, handle }
  });
  
  if (authError || !authData.user) {
    await sendTelegramMessage(chatId, `${t('registrationFailed', userLang)}: ${authError?.message || 'Unknown error'}`, {
      inline_keyboard: [[{ text: t('tryAgain', userLang), callback_data: 'create_account' }], [{ text: t('mainMenu', userLang), callback_data: 'main_menu' }]]
    });
    await supabase.from('telegram_users').update({ current_menu: 'main', menu_data: {} }).eq('telegram_id', telegramUser.id);
    return;
  }
  
  const userId = authData.user.id;
  
  await supabase.from('profiles').update({
    handle,
    date_of_birth: dob,
    country,
    language: userLang
  }).eq('id', userId);
  
  await supabase.from('telegram_users').update({ 
    user_id: userId, 
    is_linked: true, 
    current_menu: 'main', 
    menu_data: {},
    preferred_language: userLang
  }).eq('telegram_id', telegramUser.id);
  
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  const menu = buildMainMenu(true, profile, false, userLang);
  
  await sendTelegramMessage(chatId, `<b>${t('accountCreated', userLang)}</b>

${t('welcomeTo', userLang, { name: displayName })}

• ${t('email', userLang)}: ${email}
• ${t('username', userLang)}: @${handle}
• ${t('country', userLang)}: ${country}

<i>${t('canAddPictureLater', userLang)}</i>

${t('loginAt', userLang)}

` + menu.text, menu.reply_markup);
}

// ============================================
// ADMIN HANDLERS
// ============================================

async function handleAdminUserSearch(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const searchTerm = text.trim().toLowerCase();
  const { data: users } = await supabase
    .from('profiles')
    .select('id, display_name, handle, xp, is_verified')
    .or(`handle.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
    .limit(10);
  
  if (!users || users.length === 0) {
    await sendTelegramMessage(chatId, 'No users found.', {
      inline_keyboard: [[{ text: 'Search Again', callback_data: 'admin_search_user' }], [{ text: t('back', lang), callback_data: 'admin_users' }]]
    });
  } else {
    let resultText = `<b>Search Results</b>\n\nFound ${users.length} user(s):\n\n`;
    users.forEach((u: any, i: number) => {
      const verified = u.is_verified ? ' ✓' : '';
      resultText += `${i + 1}. <b>${u.display_name}</b>${verified}\n@${u.handle} · ${u.xp} Nexa\n\n`;
    });
    
    const buttons = users.map((u: any) => ([{ text: u.display_name, callback_data: `admin_user_${u.id}` }]));
    buttons.push([{ text: 'Search Again', callback_data: 'admin_search_user' }]);
    buttons.push([{ text: t('back', lang), callback_data: 'admin_users' }]);
    
    await sendTelegramMessage(chatId, resultText, { inline_keyboard: buttons });
  }
  
  await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
}

async function handleAdminGiveNexa(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const amount = parseInt(text.trim());
  const targetUserId = tgUser.menu_data?.target_user_id;
  
  if (isNaN(amount) || amount <= 0) {
    await sendTelegramMessage(chatId, 'Please enter a valid positive number:', {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: `admin_user_${targetUserId}` }]]
    });
    return;
  }
  
  const { data: currentProfile } = await supabase.from('profiles').select('xp').eq('id', targetUserId).single();
  await supabase.from('profiles').update({ xp: (currentProfile?.xp || 0) + amount }).eq('id', targetUserId);
  await supabase.from('telegram_users').update({ current_menu: 'main', menu_data: {} }).eq('telegram_id', telegramUser.id);
  
  const menu = await buildAdminUserDetailMenu(targetUserId, lang);
  await sendTelegramMessage(chatId, `${t('success', lang)}! Added ${amount} Nexa.\n\n` + menu.text, menu.reply_markup);
}

async function handleAdminGiveACoin(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const amount = parseInt(text.trim());
  const targetUserId = tgUser.menu_data?.target_user_id;
  
  if (isNaN(amount) || amount <= 0) {
    await sendTelegramMessage(chatId, 'Please enter a valid positive number:', {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: `admin_user_${targetUserId}` }]]
    });
    return;
  }
  
  const { data: currentProfile } = await supabase.from('profiles').select('acoin').eq('id', targetUserId).single();
  await supabase.from('profiles').update({ acoin: (currentProfile?.acoin || 0) + amount }).eq('id', targetUserId);
  await supabase.from('telegram_users').update({ current_menu: 'main', menu_data: {} }).eq('telegram_id', telegramUser.id);
  
  const menu = await buildAdminUserDetailMenu(targetUserId, lang);
  await sendTelegramMessage(chatId, `${t('success', lang)}! Added ${amount} ACoin.\n\n` + menu.text, menu.reply_markup);
}

async function handleAdminBroadcast(chatId: number, telegramUser: any, tgUser: any, text: string, lang: Lang) {
  const message = text.trim();
  
  if (message.length < 1) {
    await sendTelegramMessage(chatId, 'Message cannot be empty.', {
      inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'admin_menu' }]]
    });
    return;
  }
  
  const { data: telegramUsers } = await supabase
    .from('telegram_users')
    .select('telegram_id')
    .eq('is_linked', true);
  
  const totalUsers = telegramUsers?.length || 0;
  let sentCount = 0;
  
  await sendTelegramMessage(chatId, `Broadcasting to ${totalUsers} users...`);
  
  for (const user of (telegramUsers || [])) {
    try {
      await sendTelegramMessage(user.telegram_id, `<b>Announcement from AfuChat</b>\n\n${message}`);
      sentCount++;
    } catch (error) {
      console.error('Broadcast error for user:', user.telegram_id, error);
    }
  }
  
  await supabase.from('telegram_users').update({ current_menu: 'main' }).eq('telegram_id', telegramUser.id);
  
  const menu = buildAdminMenu(lang);
  await sendTelegramMessage(chatId, `${t('success', lang)}! Broadcast complete.\n\nSent to ${sentCount}/${totalUsers} users.\n\n` + menu.text, menu.reply_markup);
}

// ============================================
// SERVER
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const update = await req.json();
    console.log('Telegram update:', JSON.stringify(update));
    
    // Handle pre-checkout query
    if (update.pre_checkout_query) {
      const preCheckoutQuery = update.pre_checkout_query;
      console.log('Pre-checkout query:', preCheckoutQuery);
      
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: preCheckoutQuery.id,
          ok: true
        }),
      });
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle successful payment
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const telegramUser = update.message.from;
      console.log('Successful payment:', payment);
      
      try {
        const payload = JSON.parse(payment.invoice_payload);
        
        if (payload.type === 'acoin_purchase') {
          const { userId, acoinAmount } = payload;
          
          const { data: existingTx } = await supabase
            .from('acoin_transactions')
            .select('id')
            .eq('metadata->>telegram_charge_id', payment.telegram_payment_charge_id)
            .maybeSingle();
          
          if (!existingTx) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('acoin')
              .eq('id', userId)
              .single();
            
            if (profile) {
              const newBalance = (profile.acoin || 0) + acoinAmount;
              await supabase
                .from('profiles')
                .update({ acoin: newBalance })
                .eq('id', userId);
              
              await supabase.from('acoin_transactions').insert({
                user_id: userId,
                amount: acoinAmount,
                transaction_type: 'telegram_purchase',
                metadata: {
                  telegram_charge_id: payment.telegram_payment_charge_id,
                  provider_charge_id: payment.provider_payment_charge_id,
                  total_amount: payment.total_amount,
                  currency: payment.currency
                }
              });
              
              console.log(`Successfully credited ${acoinAmount} ACoin to user ${userId}`);
              
              const { data: tgUser } = await supabase
                .from('telegram_users')
                .select('preferred_language')
                .eq('telegram_id', telegramUser.id)
                .single();
              
              const lang = (tgUser?.preferred_language as Lang) || 'en';
              
              await sendTelegramMessage(telegramUser.id, `<b>${t('success', lang)}</b>

${acoinAmount.toLocaleString()} ACoin has been added to your wallet.

<b>New Balance:</b> ${newBalance.toLocaleString()} ACoin`, {
                inline_keyboard: [[{ text: t('wallet', lang), callback_data: 'menu_wallet' }]]
              });
            }
          }
        }
      } catch (parseError) {
        console.error('Failed to parse payment payload:', parseError);
      }
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message);
    }
    
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing Telegram update:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
