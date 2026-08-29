import pytest
from app.zerodha import ZerodhaClient


def test_zerodha_client_configuration_status():
    client = ZerodhaClient(api_key="your_zerodha_api_key")
    assert client.is_configured() is False

    valid_client = ZerodhaClient(api_key="valid_key_123")
    assert valid_client.is_configured() is True


def test_zerodha_client_authentication_status():
    client = ZerodhaClient(api_key="valid_key", access_token="your_zerodha_access_token")
    assert client.is_authenticated() is False

    authenticated_client = ZerodhaClient(api_key="valid_key", access_token="token_abc_123")
    assert authenticated_client.is_authenticated() is True


def test_zerodha_login_url_unconfigured_raises():
    client = ZerodhaClient(api_key="")
    with pytest.raises(ValueError, match="KITE_API_KEY is not configured"):
        client.get_login_url()
